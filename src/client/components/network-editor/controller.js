import React from 'react';
import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import _ from 'lodash';
import ReactDOMServer from 'react-dom/server';
import JSZip from 'jszip';
import { Canvg, presets } from 'canvg';
import { saveAs } from 'file-saver';

import { DEFAULT_PADDING } from '../defaults';
import { clusterColor } from './network-style';
import { monkeyPatchMathRandom, restoreMathRandom } from '../../rng';
import { SearchController } from './search-contoller';
import { UndoHandler } from './undo-stack';
import { getLegendSVG } from './legend-svg';

import ZoomOutMapIcon from '@material-ui/icons/ZoomOutMap';
import { ZoomInIcon } from '../svg-icons';

// Clusters that have this many nodes get optimized.
// Note we are using number of nodes as a proxy for number of edges, assuming large clusters are mostly complete.
const LARGE_CLUSTER_SIZE = 33; // approx 500 edges in a complete graph

// Keys for scratch data
export const Scratch = {
  // boolean flag indicating if the expand/collapse layout is currently running, attached to parent nodes
  LAYOUT_RUNNING: '_layoutRunning',
  // BubblePath instance, attached to parent nodes
  BUBBLE: '_bubble',
  // The HTML element for the expand/collapse toggle buttons, attached to parent nodes
  TOGGLE_BUTTON_ELEM: '_buttonElem',
};

// Sizes of exported PNG images
export const ImageSize = {
  SMALL:  { value:'SMALL',  scale: 0.5 },
  MEDIUM: { value:'MEDIUM', scale: 1.0 },
  LARGE:  { value:'LARGE',  scale: 2.0 },
};

/**
 * The network editor controller contains all high-level model operations that the network
 * editor view can perform.
 *
 * @property {Cytoscape.Core} cy The graph instance
 * @property {EventEmitter} bus The event bus that the controller emits on after every operation
 * @property {Number} minRank The minimum rank value of the current network
 * @property {Number} maxRank The maximum rank value of the current network
 * @property {String} networkIDStr The network UUID
 */
export class NetworkEditorController {
  /**
   * Create an instance of the controller
   * @param {Cytoscape.Core} cy The graph instance (model)
   * @param {EventEmitter} bus The event bus that the controller emits on after every operation
   */
  constructor(cy, bus) {
    /** @type {Cytoscape.Core} */
    this.cy = cy;
    /** @type {EventEmitter} */
    this.bus = bus || new EventEmitter();
    /** @type {Number} */
    this.minRank = 0;
    /** @type {Number} */
    this.maxRank = 0;
    /** @type {String} */
    this.networkIDStr = cy.data('id');

    this.searchController = new SearchController(cy, this.bus);
    this.undoHandler = new UndoHandler(this);

    this.networkLoaded = false;

    this.bus.on('networkLoaded', (flags) => {
      this.networkLoaded = true;
      this.undoHandler.init();
      this._fetchMinMaxRanks();
      this._createExpandCollapseButtons();
      
      if(flags.layoutWasRun) {
        this.savePositions();
      }
    });
  }

  isNetworkLoaded() {
    return this.networkLoaded;
  }

  isGeneListIndexed() {
    return this.searchController.isGeneListIndexed();
  }

  isPathwayListIndexed() {
    return this.searchController.isPathwayListIndexed();
  }

  searchGenes(query) {
    return this.searchController.searchGenes(query);
  }

  searchPathways(query) {
    return this.searchController.searchPathways(query);
  }

  isDemoNetwork() {
    return Boolean(this.cy.data('demo'));
  }

  openDemoNetworkInfoSite() {
    const pathwayCommonsURL = 'https://www.pathwaycommons.org/guide/workflows/rna_seq_to_enrichment_map/';
    window.open(pathwayCommonsURL, '_blank');
  }

  _computeFCOSEidealEdgeLengthMap(clusterLabels, clusterAttr) {
    const idealLength = size => {
      switch(true) {
        case size < 10: return 40;
        case size < 20: return 75;
        case size < 30: return 120;
        case size < 40: return 180;
        default:        return 250;
      }
    };

    const edgeLengthMap = new Map();

    clusterLabels.forEach(({ clusterId }) => {
      const cluster = this.cy.elements(`node[${clusterAttr}="${clusterId}"]`);
      if(!cluster.empty()) {
        const ideal = idealLength(cluster.size());
        cluster.internalEdges().forEach(edge => {
          edgeLengthMap.set(edge.data('id'), ideal);
        });
      }
    });

    return edgeLengthMap;
  }


  async applyLayout(clusterLabels, clusterAttr) {
    const { cy } = this;

    const merge = (components) => {
      const collection = cy.collection();
      components.forEach(comp => {
        collection.merge(comp);
      });
      return collection;
    };

    const [ posComponents, negComponents ] = this._partitionComponentsByNES(cy.elements());
    const negEles = merge(negComponents);
    const posEles = merge(posComponents);

    // Partitioned layout, blue on left, red on right
    await this._applyLayoutToEles(negEles, clusterLabels, clusterAttr); // blue
    await this._applyLayoutToEles(posEles, clusterLabels, clusterAttr); // red

     // Shift over
    const negBB = negEles.boundingBox();
    const posBB = posEles.boundingBox();
    const dx = negBB.w + 50; // padding
    const dy = negBB.y2 - posBB.y2;
    
    posEles.nodes().positions(node => {
      const pos = node.position();
      return {
        x: pos.x + dx,
        y: pos.y + dy
      };
    });
  }

  _partitionComponentsByNES(eles) {
    const components = eles.components(); // array of collections

    const pos = [], neg = [];
    components.forEach(comp => {
      const avgNES = this.getAverageNES(comp.nodes());
      (avgNES < 0 ? neg : pos).push(comp);
    });

    return [ pos, neg ]; 
  }

  /**
   * Stops the currently running layout, if there is one, and apply the new layout options.
   */
  async _applyLayoutToEles(eles, clusterLabels, clusterAttr) {
    if (this.layout) {
      this.layout.stop();
    }
    const { cy } = this;
    // unrestricted zoom, since the old restrictions may not apply if things have changed
    cy.minZoom(-1e50);
    cy.maxZoom(1e50);

    const idealLengths = this._computeFCOSEidealEdgeLengthMap(clusterLabels, clusterAttr);

    const options = {
      name: 'fcose',
      animate: false,
      idealEdgeLength: edge => idealLengths.get(edge.data('id')) || 50,
      nodeRepulsion: 100000
    };

    const allNodes = eles.nodes();
    const disconnectedNodes = allNodes.filter(n => n.degree() === 0); // careful, our compound nodes have degree 0
    const connectedNodes = allNodes.not(disconnectedNodes);
    const networkWithoutDisconnectedNodes = eles.not(disconnectedNodes);
    const networkToLayout = networkWithoutDisconnectedNodes;

    // monkeyPatchMathRandom(); // just before the FD layout starts
    
    const start = performance.now();

    this.layout = networkToLayout.layout(options);
    const onStop = this.layout.promiseOn('layoutstop');
    this.layout.run();
    await onStop;

    const layoutDone = performance.now();
    console.log(`layout time: ${Math.round(layoutDone - start)}ms`);

    this._packComponents(networkToLayout);

    const packDone = performance.now();
    console.log(`packing time: ${Math.round(packDone - layoutDone)}ms`);

    // restoreMathRandom(); // after the FD layout is done

    const connectedBB = connectedNodes.boundingBox();
    // Style hasn't been applied yet, there are no labels. Filter out compound nodes.
    const nodeWidth = disconnectedNodes.filter(n => !n.isParent()).max(n => n.boundingBox().w).value; 
    const avoidOverlapPadding = 45;
    const cols = Math.floor(connectedBB.w / (nodeWidth + avoidOverlapPadding));

    const cmpByNES = (a, b) => b.data('NES') - a.data('NES'); // up then down

    disconnectedNodes.sort(cmpByNES).layout({
      name: 'grid',
      boundingBox: {
        x1: connectedBB.x1,
        x2: connectedBB.x2,
        y1: connectedBB.y2 + DEFAULT_PADDING * 3,
        y2: connectedBB.y2 + DEFAULT_PADDING + 10000
      },
      avoidOverlapPadding,
      cols,
      condense: true,
      avoidOverlap: true,
      nodeDimensionsIncludeLabels: true,
      fit: false
    }).run();
  }


  _packComponents(eles) {
    const layoutNodes = [];

    eles.components().forEach((component, i) => {
      component.nodes().forEach(n => {

        const bb = n.layoutDimensions({ nodeDimensionsIncludeLabels: true }); // TODO do we want labels included?

        layoutNodes.push({
          id: n.data('id'),
          cmptId: i,
          x: n.position('x'),
          y: n.position('y'),
          width:  bb.w,
          height: bb.h,
          isLocked: false
        });

      });
    });

    // TODO can the width and height be specified to a specific aspect ratio?
    const options = {
      clientWidth:  this.cy.width(),
      clientHeight: this.cy.height(),
      componentSpacing: 40 // default is 40
    };

    // updates the x,y fields of each layoutNode object
    this._separateComponents(layoutNodes, options);

    // can call applyPositions() because each 'layoutNode' has x, y and id fields.
    this.applyPositions(layoutNodes);
  }

  /**
   * From the cytoscape.js 'cose' layout.
   */
  _separateComponents(nodes, options) {
    const components = [];
  
    for(let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const cid = node.cmptId;
      const component = components[cid] = components[cid] || [];
      component.push(node);
    }
  
    let totalA = 0;
  
    for(let i = 0; i < components.length; i++) {
      const c = components[i];
      if(!c){ continue; }
  
      c.x1 =  Infinity;
      c.x2 = -Infinity;
      c.y1 =  Infinity;
      c.y2 = -Infinity;
  
      for(let j = 0; j < c.length; j++) {
        const n = c[j];
        c.x1 = Math.min( c.x1, n.x - n.width / 2 );
        c.x2 = Math.max( c.x2, n.x + n.width / 2 );
        c.y1 = Math.min( c.y1, n.y - n.height / 2 );
        c.y2 = Math.max( c.y2, n.y + n.height / 2 );
      }
  
      c.w = c.x2 - c.x1;
      c.h = c.y2 - c.y1;
      totalA += c.w * c.h;
    }
  
    components.sort((c1, c2) =>  c2.w * c2.h - c1.w * c1.h);
  
    let x = 0;
    let y = 0;
    let usedW = 0;
    let rowH = 0;
    const maxRowW = Math.sqrt(totalA) * options.clientWidth / options.clientHeight;
  
    for(let i = 0; i < components.length; i++) {
      const c = components[i];
      if(!c){ continue; }
  
      for(let j = 0; j < c.length; j++) {
        const n = c[j];
        if(!n.isLocked) {
          n.x += (x - c.x1);
          n.y += (y - c.y1);
        }
      }
  
      x += c.w + options.componentSpacing;
      usedW += c.w + options.componentSpacing;
      rowH = Math.max(rowH, c.h);
  
      if(usedW > maxRowW) {
        y += rowH + options.componentSpacing;
        x = 0;
        usedW = 0;
        rowH = 0;
      }
    }
  }


  fitAndSetZoomMinMax() {
    this.cy.fit(DEFAULT_PADDING);
    // now that we know the zoom level when the graph fits to screen, we can use restrictions
    this.cy.minZoom(this.cy.zoom() * 0.25);
    this.cy.maxZoom(2);
  }

  async savePositions() {
    console.log("saving positions...");

    // Deleted nodes are not present in the 'positions' document
    const positions = this.cy.nodes()
      .map(node => ({ 
        id: node.data('id'),
        x:  node.position().x,
        y:  node.position().y,
        collapsed: node.data('collapsed')
      }));

    const res = await fetch(`/api/${this.networkIDStr}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positions
      })
    });

    if(res.ok) {
      console.log("positions saved");
    } 
  }

  async restoreNetwork() {
    const res = await fetch(`/api/${this.networkIDStr}/positions`, {
      method: 'DELETE',
    });
    if(res.ok) {
      location.reload();
    }
  }


  highlightElements(nodes, highlightNeighbors) {
    let toHl = this.cy.pathwayNodes().add(this.cy.edges());
    let toUnhl = this.cy.collection();

    const highlight = (eles) => {
      toHl = toHl.add(eles);
      toUnhl = toUnhl.not(eles);
    };
    const unhighlight = (eles) => {
      toHl = toHl.not(eles);
      toUnhl = toUnhl.add(eles);
    };
    const normlight = (eles) => {
      toUnhl = toUnhl.not(eles);
    };

    this.cy.batch(() => {
      let initted = false;
      
      const initAllUnhighlighted = () => {
        if (initted) {
          return;
        }
        unhighlight(this.cy.elements());
        initted = true;
      };

      if (nodes && nodes.length > 0) {
        initAllUnhighlighted();
        highlight(nodes);
        if (highlightNeighbors) {
          normlight(nodes.neighborhood());
        } else {
          normlight(nodes.edgesWith(nodes));
        }
      }

      // Apply highlights
      const eles = this.cy.elements();
      eles.not(toHl).removeClass('highlighted');
      eles.not(toUnhl).removeClass('unhighlighted');
      toHl.removeClass('unhighlighted');
      toHl.not(this.cy.nodes(':compound')).addClass('highlighted');
      toUnhl.removeClass('highlighted');
      toUnhl.not(this.cy.nodes(':compound')).addClass('unhighlighted');

      // Apply to compound nodes
      eles.parent().forEach(parent => {
         // If all children are unhighlighted then hide the parent
        const hide = parent.children().every(child => child.hasClass('unhighlighted'));
        parent[hide ? 'addClass' : 'removeClass']('unhighlighted');

        const bubble = parent.scratch(Scratch.BUBBLE);
        bubble?.node?.classList?.[hide ? 'add' : 'remove']('unhighlighted');

        const elem = parent.scratch(Scratch.TOGGLE_BUTTON_ELEM);
        elem.style.opacity = hide ? 0 : 1; // don't change 'visibility' prop because the mouse hover event uses that
      });
    });
  }


  toggleExpandCollapse(parent, requestAnimate = false) {
    if(parent.scratch(Scratch.LAYOUT_RUNNING))
      return;
    parent.scratch(Scratch.LAYOUT_RUNNING, true);

    const collapsed = parent.data('collapsed');
    const shrinkFactor = 0.2;
    const spacingFactor = collapsed ? (1.0 / shrinkFactor) : shrinkFactor;

    const nodes = parent.children();
    const edges = nodes.internalEdges();

    const layout = nodes.layout({
      name: 'preset',
      positions: n => n.position(),
      fit: false,
      animate: requestAnimate && nodes.size() < LARGE_CLUSTER_SIZE,
      spacingFactor
    });
    
    const onStop = layout.promiseOn('layoutstop');

    parent.data('collapsed', !collapsed);

    if(collapsed) {
      edges.style('visibility', 'visible');
      onStop.then(() => { 
        nodes.data('collapsed', !collapsed);
      });
    } else {
      nodes.data('collapsed', !collapsed);
      onStop.then(() => {
        edges.style('visibility', 'hidden');
      });
    }

    onStop.then(() => {
      parent.scratch(Scratch.LAYOUT_RUNNING, false);
      this.bus.emit('toggleExpandCollapse', parent, collapsed);
    });

    layout.run();

    return onStop;
  }


  /**
   * positions is an array of objects of the form...
   * [ { id: "node-id", x:1.2, y:3.4 }, ...]
   * 
   * Returns a Map object of nodeID -> position object
   */
  applyPositions(positions) {
    const positionsMap = new Map(positions.map((obj) => [obj.id, obj]));
    this.cy.nodes().positions(node => positionsMap.get(node.data('id')));
    return positionsMap;
  }


  getAverageNES(nodes) {
    let nes = 0;
    nodes.forEach(node => {
      nes += node.data('NES');
    });
    return _.round(nes / nodes.length, 4);
  }

  _setAverageNES(parent) {
    const nes = this.getAverageNES(parent.children());
    parent.data('NES', nes); 
    return nes;
  }

  /**
   * Creates, removes, or updates a bubble path depending on the state of the parent node.
   */
  _createOrUpdateBubblePath(parent) {
    if(!this.bubbleSets) {
      this.bubbleSets = this.cy.bubbleSets(); // only create one instance of this plugin
    }

    const existingPath = parent.scratch(Scratch.BUBBLE);
    if(existingPath) {
      this.bubbleSets.removePath(existingPath);
    }

    if(parent.removed())
      return;

    const nodes = parent.children();
    const large = nodes.size() >= LARGE_CLUSTER_SIZE;

    let edges = nodes.internalEdges();
    if(large) {
      edges = edges.shuffle().slice(0, 300); // Take a random sample of edges
    }

    const c = clusterColor(parent); // Average NES needs to be set on the parent first
    const rgb = `rgb(${c.r}, ${c.g}, ${c.b}, 0.2)`;
    const throttle = large ? 250 : 50; 

    const bubblePath = this.bubbleSets.addPath(nodes, edges, null, {
      virtualEdges: false,
      interactive: false,
      throttle,
      style: { 'fill': rgb, 'stroke': rgb, 'stroke-width': 1 }
    });

    // Save the bubblePath object in the parent node
    parent.scratch(Scratch.BUBBLE, bubblePath);
    return bubblePath;
  }


  _createExpandCollapseButtons() {
    const { cy } = this;
    const layers = cy.layers();

    // Create a layer to hold the button elements
    const buttonLayer = layers.append('html', { stopClicks: true });

    const setButtonHTML = (elem, parent) => {
      const collapsed = parent.data('collapsed');
      const jsx = collapsed ? <ZoomOutMapIcon /> : <ZoomInIcon />;
      const html = ReactDOMServer.renderToStaticMarkup(jsx);
      elem.innerHTML = html;
    };

    // Switch the button icon when the cluster is expanded or collapsed.
    this.bus.on('toggleExpandCollapse', parent => {
      const elem = parent.scratch(Scratch.TOGGLE_BUTTON_ELEM);
      setButtonHTML(elem, parent);
    });

    // Toggle expand/collapse if user clicks direclty on the bubble.
    cy.on('click', e => {
      if(e.target === cy) {
        const parent = this.getBubbleSetParent(e.position);
        if(parent) {
          this.toggleExpandCollapse(parent, true);
        }
      }
    });
  
    // Detect when the user hovers over the bubble and show/hide the button.
    let prevParent = null;
    cy.on('mousemove', _.throttle(e => {
      const parent = this.getBubbleSetParent(e.position);
      if(prevParent && prevParent !== parent) {
        const elem = prevParent.scratch(Scratch.TOGGLE_BUTTON_ELEM);
        elem.style.visibility = 'hidden';
        prevParent = null;
      }
      if(parent) {
        const elem = parent.scratch(Scratch.TOGGLE_BUTTON_ELEM);
        elem.style.visibility = 'visible';
        prevParent = parent;
      }
    }, 100));

    // Create a button for each cluster
    const createClusterToggleButton = (elem, parent) => {
      elem.classList.add('cluster-toggle-button');
      elem.style.visibility = 'hidden';
      parent.scratch(Scratch.TOGGLE_BUTTON_ELEM, elem);

      setButtonHTML(elem, parent);

      // Toggle expand/collapse when user clicks on the button
      elem.addEventListener('click', async () => {
        await this.toggleExpandCollapse(parent, true);
      });
    };

    // eslint-disable-next-line no-unused-vars
    layers.renderPerNode(buttonLayer, (elem, node, bb) => {}, {
      init: (elem, node) => {
        if(node.isParent()) {
          createClusterToggleButton(elem, node);
        }
      },
      transform: 'translate(-50%,-50%)',
      position: 'center',
      uniqueElements: true,
      checkBounds: true,
    });
  }


  createCompoundNodes(clusterLabels, clusterAttr) {
    clusterLabels.forEach(({ clusterId, label }) => {
      const cluster = this.cy.elements(`node[${clusterAttr}="${clusterId}"]`);
      if(cluster.empty())
        return;
  
      // Create compound nodes
      this.cy.add({
        group: 'nodes',
        name: label,
        data: { 
          label, //: `${label} (${cluster.size()})`,
          id: clusterId,
          _isParent: true, // TODO (remove this).. Important, used to identify parent nodes when the undoHelper restores them.
        }
      });
      cluster.forEach(node => {
        node.move({ parent: clusterId });
      });
    });
  }


  /**
   * positionsMap: a Map object returned by applyPositions(), or undefined, contains info on which clusters are collapsed
   */
  createBubbleClusters(positionsMap) {
    const { cy } = this;

    if(positionsMap) {
      const deletedNodes = cy.nodes().filter(n => !positionsMap.has(n.data('id')));
      console.log("there are " + deletedNodes.size() + " deleted nodes");
      cy.remove(deletedNodes);
    }
    
    cy.on('boxstart', () => cy.pathwayNodes().addClass('box-select-enabled'));
    cy.on('boxend', () => cy.pathwayNodes().removeClass('box-select-enabled'));

    cy.clusterNodes().forEach(parent => {
      const cluster = parent.children();

      if(positionsMap) {
        const id = cluster.slice(0,1).data('id');
        const obj = positionsMap.get(id);
        if(obj && obj.collapsed) {
          cluster.data('collapsed', true);
          parent.data('collapsed', true);
        }
      } else {
        // If collapsed status was not saved on the server then collapse all clusters initially
        this.toggleExpandCollapse(parent, false);
      }

      this._setAverageNES(parent);
      const bubblePath = this._createOrUpdateBubblePath(parent);

      parent.on('position', () => {
        // When the children are ungrabified the 'position' event is not fired for them, must update the bubble path manually.
        if(!parent.children().grabbable()) { 
          bubblePath.update();
        }
      });
  
      parent.on('tap', evt => {
        const ele = evt.target;
        const collapsed = parent.data('collapsed');
        // Click a compound node to toggle its collapsed state
        // or click any collapsed child node to expand the cluster
        if (ele.isParent() || collapsed) {
          this.toggleExpandCollapse(parent, true);
        }
      });
    });
  }


  /**
   * Returns the cluster parent node for the bubble path that contains the given position. 
   * If there is more than one bubble overlapping at the given position then one of the 
   * cluster parents is returned arbitrarily.
   * 
   * Note: Requires the 'svg_point_factory' that is added to the DOM by the NetworkEditor component.
   */
  getBubbleSetParent(position) {
    const svgPointFactory = document.getElementById('svg_point_factory');
    const point = svgPointFactory.createSVGPoint();
    point.x = position.x;
    point.y = position.y;

    const paths = this.bubbleSets ? this.bubbleSets.getPaths() : [];
    for(const path of paths) {
      // Could check if the point is inside the bubble's bounding box first
      // before calling isPointInFill(), it might be faster.
      const inside = path.node.isPointInFill(point);
      if(inside) {
        const parentNodes = this.cy.nodes(':parent');
        const parent = parentNodes.filter(parent => path === parent.scratch(Scratch.BUBBLE));
        if(!parent.empty()) {
          return parent;
        }
        break;
      }
    }
  }


  /**
   * Delete the selected (i.e. :selected) elements in the graph
   */
  deleteSelectedNodes() {
    let selectedNodes = this.cy.nodes(':selected');
    selectedNodes = selectedNodes.filter(n => n.children().empty()); // Filter out parent nodes
    if(selectedNodes.empty())
      return;

    const parentNodes = selectedNodes.parent();

    // Remove the bubble paths before deleting their contents, or else an error occurs
    parentNodes.forEach(parent => {
      const bubblePath = parent.scratch(Scratch.BUBBLE);
      if(bubblePath) {
        this.bubbleSets.removePath(bubblePath);
      }
    });

    const deletedNodes = selectedNodes.remove();

    parentNodes.forEach(parent => {
      if(parent.children().empty()) {
        this.cy.remove(parent);
      } else {
        this._setAverageNES(parent);
      }
      this._createOrUpdateBubblePath(parent);
    });

    this.bus.emit('deletedSelectedNodes', deletedNodes);
  }

  async _fetchMinMaxRanks() {
    const res = await fetch(`/api/${this.networkIDStr}/minmaxranks`);
    const json = await res.json();
    this.minRank = json ? json.minRank : 0;
    this.maxRank = json ? json.maxRank : 0;
  }

  /**
   * Needed by the gene sidebar.
   */
  async fetchGeneList(geneSetNames, intersection = false) {
    geneSetNames = geneSetNames || [];
    return this.searchController.queryPathwayGenes(geneSetNames, intersection);
  }


  async fetchGeneListFromServer(geneSetNames, intersection = false) {
    // Note, this method is slow, use searchController.queryPathwayGenes(...) instead
    const nameSet = new Set(geneSetNames);

    // Check local cache first
    if (this.lastGeneSet && 
        this.lastGeneSetIntersection === intersection && 
        _.isEqual(this.lastGeneSetNames, nameSet)) {
      return this.lastGeneSet.genes;
    }

    // New query...
    const queryParams = new URLSearchParams({ intersection });
    const res = await fetch(`/api/${this.networkIDStr}/genesets?${queryParams}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        geneSets: geneSetNames
      })
    });

    if (res.ok) {
      const geneSet = await res.json();
      const rankedGenes = geneSet.genes.filter(g => _.has(g, 'rank'));
      geneSet.genes = rankedGenes;

      // Cache the last query
      this.lastGeneSetIntersection = intersection;
      this.lastGeneSet = geneSet;
      this.lastGeneSetNames = nameSet;

      return geneSet.genes;
    }
  }
  

  async exportImageArchive() {
    const blobs = await Promise.all([
      this.createNetworkImageBlob(ImageSize.SMALL),
      this.createNetworkImageBlob(ImageSize.MEDIUM),
      this.createNetworkImageBlob(ImageSize.LARGE),
      this.createSVGLegendBlob()
    ]);
  
    const zip = new JSZip();
    zip.file('enrichment_map_small.png',  blobs[0]);
    zip.file('enrichment_map_medium.png', blobs[1]);
    zip.file('enrichment_map_large.png',  blobs[2]);
    zip.file('node_color_legend_NES.svg', blobs[3]);
  
    const fileName = this.getZipFileName('images');
    this.saveZip(zip, fileName);
  }

  async exportDataArchive() {
    const netID = this.networkIDStr;
  
    const fetchExport = async path => {
      const res = await fetch(path);
      return await res.text();
    };
  
    const files = await Promise.all([
      fetchExport(`/api/export/enrichment/${netID}`),
      fetchExport(`/api/export/ranks/${netID}`),
      fetchExport(`/api/export/gmt/${netID}`),
    ]);
  
    const zip = new JSZip();
    zip.file('enrichment_results.txt', files[0]);
    zip.file('ranks.txt', files[1]);
    zip.file('gene_sets.gmt', files[2]);
  
    const fileName = this.getZipFileName('enrichment');
    this.saveZip(zip, fileName);
  }

  async saveGeneList(genesJSON, pathways) { // used by the gene list panel (actually left-drawer.js)
    if(pathways.length == 0)
      return;

    let fileName = 'gene_ranks.zip';
    if(pathways.length == 1)
      fileName = `gene_ranks_(${pathways[0]}).zip`;
    else if(pathways.length <= 3)
      fileName = `gene_ranks_(${pathways.slice(0,3).join(',')}).zip`;
    else
      fileName = `gene_ranks_${pathways.length}_pathways.zip`;

    const geneLines = ['gene\trank'];
    for(const { gene, rank } of genesJSON) {
      geneLines.push(`${gene}\t${rank}`);
    }
    const genesText = geneLines.join('\n');
    const pathwayText = pathways.join('\n');
  
    const zip = new JSZip();
    zip.file('gene_ranks.txt', genesText);
    zip.file('pathways.txt', pathwayText);

    this.saveZip(zip, fileName);
  }

  async createNetworkImageBlob(imageSize) {
    const { cy, bubbleSets } = this;
    const renderer = cy.renderer();
  
    // render the network to a buffer canvas
    const cyoptions = {
      output: 'blob',
      bg: 'white',
      full: true, // full must be true for the calculations below to work
      scale: imageSize.scale,
    };
    const cyCanvas = renderer.bufferCanvasImage(cyoptions);
    const { width, height } = cyCanvas;
  
    // compute the transform to be applied to the bubbleSet svg layer
    // this code was adapted from the code in renderer.bufferCanvasImage()
    var bb = cy.elements().boundingBox();
    const pxRatio = renderer.getPixelRatio();
    const scale = imageSize.scale * pxRatio;
    const dx = -bb.x1 * scale;
    const dy = -bb.y1 * scale;
    const transform = `translate(${dx},${dy})scale(${scale})`;
  
    // get the bubbleSet svg element
    const svgElem = bubbleSets.layer.node.parentNode.cloneNode(true);
    svgElem.firstChild.setAttribute('transform', transform); // firstChild is a <g> tag
  
    // render the bubbleSet svg layer using Canvg library
    const svgCanvas = new OffscreenCanvas(width, height);
    const ctx = svgCanvas.getContext('2d');
    const svgRenderer = await Canvg.from(ctx, svgElem.innerHTML, presets.offscreen());
    await svgRenderer.render();
  
    // combine the layers
    const combinedCanvas = new OffscreenCanvas(width, height);
    const combinedCtx = combinedCanvas.getContext('2d');
    combinedCtx.drawImage(cyCanvas,  0, 0);
    combinedCtx.drawImage(svgCanvas, 0, 0);
  
    const blob = await combinedCanvas.convertToBlob();
    return blob;
  }

  async createSVGLegendBlob() {
    const svg = getLegendSVG(this);
    return new Blob([svg], { type: 'text/plain;charset=utf-8' });
  }
   
  getZipFileName(suffix) {
    const networkName = this.cy.data('name');
    if(networkName) {
      // eslint-disable-next-line no-control-regex
      const reserved = /[<>:"/\\|?*\u0000-\u001F]/g;
      if(!reserved.test(networkName)) {
        return `${networkName}_${suffix}.zip`;
      }
    }
    return `enrichment_map_${suffix}.zip`;
  }

  async saveZip(zip, fileName) {
    const archiveBlob = await zip.generateAsync({ type: 'blob' });
    await saveAs(archiveBlob, fileName);
  }
}
