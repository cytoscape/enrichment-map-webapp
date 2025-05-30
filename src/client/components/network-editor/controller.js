import React from 'react';
import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import _ from 'lodash';
import ReactDOMServer from 'react-dom/server';

import { DEFAULT_PADDING } from '../defaults';
import { clusterColor } from './network-style';
import { monkeyPatchMathRandom, restoreMathRandom } from '../../rng'; // eslint-disable-line
import { SearchController } from './search-contoller';
import { ExportController } from './export-controller';
import { UndoHandler } from './undo-stack';

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
  AUTOMOVE_RULE: '_automoveRule'
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
    this.exportController = new ExportController(this);
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

    window.cy = cy; // for access in the console
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
        const bb = n.layoutDimensions();

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

    const options = {
      clientWidth:  400,
      clientHeight: 300,
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

  renameNetwork(newName) {console.log("rename network: " + newName);
    const networkName = newName != null ? newName.trim() : null;
    this.cy.data({ name: networkName });
  
    fetch(`/api/${this.networkIDStr}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ networkName })
    });
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

    const { cy } = this;
    const collapsed = parent.data('collapsed');
    const shrinkFactor = 0.2;
    const spacingFactor = collapsed ? (1.0 / shrinkFactor) : shrinkFactor;
    const nodes = parent.children();
    const edges = nodes.internalEdges();
    const connectedEdges = nodes.connectedEdges();
    const shouldAnimate = requestAnimate && nodes.size() < LARGE_CLUSTER_SIZE;
    const automoveRule = parent.scratch(Scratch.AUTOMOVE_RULE);

    const layout = nodes.layout({
      name: 'preset',
      positions: n => n.position(),
      fit: false,
      animate: shouldAnimate,
      spacingFactor
    });
    
    const layoutPromise = layout.promiseOn('layoutstop');

    parent.data('collapsed', !collapsed);
    connectedEdges.data('collapsed', !collapsed);
    cy.edges().not(connectedEdges).data('collapsed', collapsed);

    if(collapsed) {
      edges.style('visibility', 'visible');
      layoutPromise.then(() => nodes.data('collapsed', !collapsed));
      setTimeout(() => { nodes.select(); }, 0);
    } else {
      nodes.data('collapsed', !collapsed);
      layoutPromise.then(() => edges.style('visibility', 'hidden'));
    }

    const afterLayoutPromise = layoutPromise.then(() => {
      parent.scratch(Scratch.LAYOUT_RUNNING, false);
      this.bus.emit('toggleExpandCollapse', parent, collapsed);

      if(collapsed) {
        automoveRule.disable();
      } else {
        automoveRule.enable();
      }

      if(collapsed) { // if it was collapsed, this runs after the layout so its expanded now
        const getAnimation = () => {
          const bb = parent.renderedBoundingBox({ includeLabels: true });
          const extent = cy.renderedExtent();

          // if the expanded cluster is larger than the viewport, then fit it to the viewport
          if(bb.h > extent.h || bb.w > extent.w) {
            return { 
              fit: { 
                eles: parent, 
                padding: DEFAULT_PADDING 
              } 
            };
          }

          // if the expanded cluster is out of bounds, then pan it into the viewport
          const panBy = { x: 0, y: 0 };
          if(bb.x1 < extent.x1) {
            panBy.x = extent.x1 - bb.x1 + DEFAULT_PADDING;
          } else if(bb.x2 > extent.x2) {
            panBy.x = extent.x2 - bb.x2 - DEFAULT_PADDING;
          }
          if(bb.y1 < extent.y1) {
            panBy.y = extent.y1 - bb.y1 + DEFAULT_PADDING;
          } else if(bb.y2 > extent.y2) {
            panBy.y = extent.y2 - bb.y2 - DEFAULT_PADDING;
          }
          if(panBy.x != 0 || panBy.y != 0) {
            return { panBy };
          }
        };

        const animation = getAnimation();
        if(animation) {
          cy.animate({
            ...animation,
            duration: 1200,
            easing: 'spring(500, 37)'
          });
        }
      }
    });

    layout.run();

    return afterLayoutPromise;
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
      this.bubbleSets = this.cy.bubbleSets({
        interactive: false
      }); // only create one instance of this plugin
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
      const text = collapsed ? '+ Expand' : '- Collapse';
      const className = `cluster-toggle-button ${collapsed ? 'expand' : 'collapse'}`;
      const jsx = <button className={className}>{text}</button>;
      const html = ReactDOMServer.renderToStaticMarkup(jsx);
      elem.innerHTML = html;
    };

    // Create a button for a cluster
    const createClusterToggleButton = (elem, parent) => {
      parent.scratch(Scratch.TOGGLE_BUTTON_ELEM, elem);
      setButtonHTML(elem, parent);
      elem.style.visibility = 'hidden';
      elem.addEventListener('click', async () => {
        await this.toggleExpandCollapse(parent, true);
      });
      elem.addEventListener('touchstart', async (e) => {
        e.preventDefault();
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
      position: 'center', // cytoscape-layers only supports 'center' and 'top-left'
      uniqueElements: true,
      checkBounds: true,
    });

    // Switch the button icon when the cluster is expanded or collapsed.
    this.bus.on('toggleExpandCollapse', parent => {
      const elem = parent.scratch(Scratch.TOGGLE_BUTTON_ELEM);
      setButtonHTML(elem, parent);
    });

    const getCompoundNodeAtPosition = (x, y) => {
      for(const parent of cy.clusterNodes()) {
        const bb = parent.bb();
        if(x >= bb.x1 && x <= bb.x2 && y >= bb.y1 && y <= bb.y2) {
          return parent;
        }
      }
    };

    // Detect when the user hovers over the parent node and show the button.
    // Use 'mousemove' instead of 'mouseover' because that makes the button disapear when hovering over an edge.
    // Also detect panning a cluster to the center in order to support touch screens.
    // Automatically hide the button after a timeout, so it doesn't always obscure the nodes under it.
    const timeout = 3000;
    let timeoutID = null;
    let prevParent = null;

    const showButton = parent => {
      if(parent === null || parent === undefined)
        return;
      clearTimeout(timeoutID);
      for(const cn of cy.clusterNodes()) {
        const elem = cn.scratch(Scratch.TOGGLE_BUTTON_ELEM);
        if(parent === cn) {
          elem.style.visibility = 'visible'; 
          timeoutID = setTimeout(() => elem.style.visibility = 'hidden', timeout);
        } else {
          elem.style.visibility = 'hidden'; 
        }
      }
    };

    const handleShowButton = position => {
      const { x, y } = position;
      const parent = getCompoundNodeAtPosition(x, y); // could use the bubble instead, not sure which is better
      // User has to move mouse away from cluster then back over it again to make the button show again after it times out.
      if(prevParent != parent) {
        showButton(parent);
      }
      prevParent = parent;
    };

    this.bus.on('toggleExpandCollapse', parent => {
      showButton(parent); // reset the timer
    });

    cy.on('mousemove', _.throttle((e) => {
      handleShowButton(e.position);
    }, 50));

    cy.on('pan', () => {
      const bb = cy.extent();
      const center = { x: bb.x1 + bb.w/2, y: bb.y1 + bb.h/2 };
      handleShowButton(center);
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
      let bubblePath = this._createOrUpdateBubblePath(parent);

      let dragging = false;

      parent.on('position', () => {
        // When the children are ungrabified the 'position' event is not fired for them, must update the bubble path manually.
        if(!parent.children().grabbable() && !dragging) { 
          bubblePath.update();
        }
      });

      let x0 = 0;
      let y0 = 0;
      let draggedBubblePathSVG;

      parent.on('grab', () => {
        x0 = cluster[0].position().x;
        y0 = cluster[0].position().y;
      }).on('drag', (e) => {
        const dx = cluster[0].position().x - x0;
        const dy = cluster[0].position().y - y0;

        const collapsed = parent.data('collapsed');

        if (!collapsed && !e.target.same(parent) && !cluster.allAre(':selected')) {
          // don't apply when expanded and dragging just some children
        } else if (!dragging) {
          draggedBubblePathSVG = bubblePath.node.cloneNode();
          bubblePath.node.parentNode.appendChild(draggedBubblePathSVG);

          bubblePath.remove();

          dragging = true;
        } else {
          draggedBubblePathSVG.style.transform = `translate(${dx}px, ${dy}px)`;
        }
      }).on('free', () => {
        if (dragging) {
          dragging = false;

          draggedBubblePathSVG.remove();

          bubblePath = this._createOrUpdateBubblePath(parent);
        }
      });

      const automoveRule = cy.automove({
        nodesMatching: cluster,
        reposition: 'drag',
        dragWith: cluster
      });

      parent.scratch(Scratch.AUTOMOVE_RULE, automoveRule);

      cluster.on('grab', () => {
        const collapsed = parent.data('collapsed');

        if (collapsed) {
          parent.addClass('grabbing-collapsed-child');
        }
      }).on('free', () => {
        parent.removeClass('grabbing-collapsed-child');
      }).on('tap', () => {
        parent.removeClass('grabbing-collapsed-child');
      });
    });

    cy.edges().data('collapsed', true);
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
  
}
