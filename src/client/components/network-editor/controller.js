import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import _ from 'lodash';
import ReactDOMServer from 'react-dom/server';

import { DEFAULT_PADDING } from '../defaults';
import { clusterColor } from './network-style';
import { monkeyPatchMathRandom, restoreMathRandom } from '../../rng';
import { SearchController } from './search-contoller';
import { UndoHandler } from './undo-stack';
import { ExpandIcon, CollapseIcon } from './share-panel';

// Clusters that have this many nodes get optimized.
// Note we are using number of nodes as a proxy for number of edges, assuming large clusters are mostly complete.
const LARGE_CLUSTER_SIZE = 33; // approx 500 edges in a complete graph

export const CoSELayoutOptions = {
  name: 'cose',
  idealEdgeLength: edge => 30 - 25 * (edge.data('similarity_coefficient')),
  edgeElasticity: edge => 10 / (edge.data('similarity_coefficient')),
  nodeRepulsion: node => 1000,
  // nodeSeparation: 75,
  randomize: true,
  animate: false,
  padding: DEFAULT_PADDING,
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

  /**
   * Stops the currently running layout, if there is one, and apply the new layout options.
   * @param {*} options
   */
  async applyLayout(options) {
    if (this.layout) {
      this.layout.stop();
    }

    // unrestricted zoom, since the old restrictions may not apply if things have changed
    this.cy.minZoom(-1e50);
    this.cy.maxZoom(1e50);

    monkeyPatchMathRandom(); // just before the FD layout starts

    this.layout = this.cy.layout(options ? options : CoSELayoutOptions);

    const onStop = this.layout.promiseOn('layoutstop');

    this.layout.run();

    await onStop;

    restoreMathRandom(); // after the FD layout is done

    // move the disconnected nodes to the bottom
    const allNodes = this.cy.nodes();
    const disconnectedNodes = allNodes.filter(n => n.degree() === 0);
    const connectedNodes = allNodes.not(disconnectedNodes);

    const connectedBB = connectedNodes.boundingBox();

    const nodeWidth = disconnectedNodes.max(n => n.boundingBox({ nodeDimensionsIncludeLabels: true }).w).value;
    const layoutWidth = connectedBB.w;
    const avoidOverlapPadding = 10;
    const cols = Math.floor(layoutWidth / (nodeWidth + avoidOverlapPadding));

    const cmpByNES = (a, b) => b.data('NES') - a.data('NES'); // up then down

    disconnectedNodes.sort(cmpByNES).layout({
      name: 'grid',
      boundingBox: {
        x1: connectedBB.x1,
        x2: connectedBB.x2,
        y1: connectedBB.y2 + DEFAULT_PADDING,
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
    });
  }

  toggleExpandCollapse(parent, requestAnimate = false) {
    if(parent.scratch('_layoutRunning'))
      return;
    parent.scratch('_layoutRunning', true);

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
      parent.scratch('_layoutRunning', false);
    });

    layout.run();

    return onStop;
  }


  // TODO only tested in Chrome so far, may not work in other browsers
  detectBubbleSetClick(svgPointFactory, position) {
    const point = svgPointFactory.createSVGPoint();
    point.x = position.x;
    point.y = position.y;

    const paths = this.bubbleSets ? this.bubbleSets.getPaths() : [];
    for(const path of paths) {
      const inside = path.node.isPointInFill(point);
      if(inside) {
        const parentNodes = this.cy.nodes(':parent');
        const parent = parentNodes.filter(parent => path === parent.scratch('_bubble'));
        if(!parent.empty()) {
          this.toggleExpandCollapse(parent, true);
        }
        break;
      }
    }
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


  _setAverageNES(parent) {
    // Set the average NES to the parent
    let nes = 0;
    const cluster = parent.children();
    cluster.forEach(node => {
      nes += node.data('NES');
    });
    nes = _.round(nes / cluster.length, 4);
    parent.data('NES', nes); 
    return nes;
  }

  /**
   * Creates, removes, or updates a bubble path depending on the state of the parent node.
   */
  _updateBubblePath(parent) {
    if(!this.bubbleSets) {
      this.bubbleSets = this.cy.bubbleSets(); // only create one instance of this plugin
    }

    const existingPath = parent.scratch('_bubble');
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
    parent.scratch('_bubble', bubblePath);
    return bubblePath;
  }


  _createExpandCollapseButtons() {
    const { cy } = this;
    const layers = cy.layers();

    const buttonLayer = layers.append('html', { stopClicks: true });

    const setButtonHTML = (elem, node) => {
      const collapsed = node.data('collapsed');
      const jsx = collapsed ? ExpandIcon() : CollapseIcon();
      const html = ReactDOMServer.renderToStaticMarkup(jsx);
      elem.innerHTML = html;
    };

    const createClusterToggleButton = (elem, parent) => {
      elem.classList.add('cluster-toggle-button');
      elem.style.visibility = 'hidden';
      setButtonHTML(elem, parent);

      elem.addEventListener('click', async e => {
        await this.toggleExpandCollapse(parent, true);
        setButtonHTML(elem, parent);
      });

      let c = 0;
      const updateVisible = e => {
        let visible = true;
        if(e.type === 'mousedown') {
          visible = false;
        } else if(e.type === 'mouseup') {
          visible = c > 0;
        } else {
          c += e.type === 'mouseover' ? 1 : -1;
          visible = c > 0;
        }
        elem.style.visibility = visible ? 'visible' : 'hidden';
      };

      const children = parent.children();
      const edges = children.internalEdges();
      parent.on('mouseover mouseout', updateVisible);
      children.on('mouseover mouseout', updateVisible);
      edges.on('mouseover mouseout', updateVisible);
      children.on('mousedown mouseup', updateVisible);
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


  /**
   * clusterDefs: array of objects of the form { clusterId: 'Cluster 1', label: 'neuclotide synthesis' }
   * positions: a Map object returned by applyPositions(), or undefined, contains info on which clusters are collapsed
   */
  createClusters(clusterDefs, clusterAttr, positionsMap) {
    const { cy } = this;

    if(positionsMap) {
      const deletedNodes = cy.nodes().filter(n => !positionsMap.has(n.data('id')));
      console.log("there are " + deletedNodes.size() + " deleted nodes");
      cy.remove(deletedNodes);
    }
    
    cy.on('boxstart', () => {
      console.log('boxstart');
      cy.pathwayNodes().addClass('box-select-enabled');
    });
    cy.on('boxend', () => {
      console.log('boxend');
      cy.pathwayNodes().removeClass('box-select-enabled');
    });

    clusterDefs.forEach(({ clusterId, label }) => {
      const cluster = cy.elements(`node[${clusterAttr}="${clusterId}"]`);
      if(cluster.empty())
        return;
  
      // Create compound nodes
      const parent = cy.add({
        group: 'nodes',
        name: label,
        data: { 
          label: label, 
          id: clusterId,
          _isParent: true, // TODO (remove this).. Important, used to identify parent nodes when the undoHelper restores them.
        }
      });
      cluster.forEach(node => {
        node.move({ parent: clusterId });
      });

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
      const bubblePath = this._updateBubblePath(parent);

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
      const bubblePath = parent.scratch('_bubble');
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
      this._updateBubblePath(parent);
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
   * Still needed by the gene sidebar.
   */
  async fetchGeneList(geneSetNames, intersection = false) {
    geneSetNames = geneSetNames || [];
    const nameSet = new Set(geneSetNames);

    // Check local cache first
    if (this.lastGeneSet && 
        this.lastGeneSetIntersection === intersection && 
        _.isEqual(this.lastGeneSetNames, nameSet)) {
      return this.lastGeneSet;
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
      const rankedGenes = geneSet.genes.filter(g => g.rank);
      geneSet.genes = rankedGenes;

      // Cache the last query
      this.lastGeneSetIntersection = intersection;
      this.lastGeneSet = geneSet;
      this.lastGeneSetNames = nameSet;

      return geneSet;
    }
  }
}
