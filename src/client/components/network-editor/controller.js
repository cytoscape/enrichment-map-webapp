import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import _ from 'lodash';

import { DEFAULT_PADDING } from '../defaults';
import { clusterColor } from './network-style';
import { monkeyPatchMathRandom, restoreMathRandom } from '../../rng';
import { SearchController } from './search-contoller';

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

    this.networkLoaded = false;

    this.bus.on('networkLoaded', () => {
      this.networkLoaded = true;
      this._fetchMinMaxRanks();
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

    this.cy.fit(DEFAULT_PADDING);

    // now that we know the zoom level when the graph fits to screen, we can use restrictions
    this.cy.minZoom(this.cy.zoom() * 0.25);
    this.cy.maxZoom(2);
  }

  highlightElements(nodes, highlightNeighbors) {
    let toHl = this.cy.nodes(':childless').add(this.cy.edges());
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

  toggleExpandCollapse(parent, animate=false) {
    const collapsed = parent.data('collapsed');
    const shrinkFactor = 0.2;
    const spacingFactor = collapsed ? (1.0 / shrinkFactor) : shrinkFactor;

    const nodes = parent.children();
    const edges = this.internalEdges(nodes);

    const toggleCollapsedFlag = eles => eles.data('collapsed', !collapsed);

    toggleCollapsedFlag(parent);

    const layout = parent.children().layout({
      name: 'preset',
      positions: node => node.position(),
      fit: false,
      animate,
      spacingFactor
    });
    
    const onStop = layout.promiseOn('layoutstop');

    if(collapsed) {
      edges.style('visibility', 'visible');
      onStop.then(() => toggleCollapsedFlag(nodes));
    } else {
      toggleCollapsedFlag(nodes);
      onStop.then(() => edges.style('visibility', 'hidden'));
    }

    layout.run();
  }


  internalEdges(cluster) {
    return cluster.connectedEdges().filter(e => cluster.contains(e.source()) && cluster.contains(e.target()));
  }

  /**
   * clusterDefs: array of objects of the form { clusterId: 'Cluster 1', label: 'neuclotide synthesis' }
   */
  createClusters(clusterDefs, clusterAttr) {
    const { cy } = this;

    clusterDefs.forEach(({ clusterId, label }) => {
      const cluster = cy.elements(`node[${clusterAttr}="${clusterId}"]`);
  
      // Create compound nodes
      const parent = cy.add({
        group: 'nodes',
        name: label,
        data: { 
          label: label, 
          id: clusterId,
        }
      });

      let nes = 0;
      cluster.forEach(node => {
        nes += node.data('NES');
        node.move({ parent: clusterId });
      });
      nes = _.round(nes / cluster.length, 4);
      parent.data('NES', nes); // Also add the average NES to the parent!

      // Create bubble sets
      const edges = this.internalEdges(cluster);
      const c = clusterColor(parent);
      const rgb = `rgb(${c.r}, ${c.g}, ${c.b}, 0.2)`;

      cy.bubbleSets().addPath(cluster, edges, null, {
        virtualEdges: false,
        style: {
          'fill': rgb,
          'stroke': rgb,
          'stroke-width': 1,
        }
      });
  
      // Collapse all clusters initially
      this.toggleExpandCollapse(parent, false);
  
      parent.on('tap', evt => {
        const ele = evt.target;
        const collapsed = parent.data('collapsed');
        
        // Clicking a child node must not select it if it's collapsed
        if (ele.isChild() && collapsed) {
          ele.once('select', () => ele.unselect());
        }
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
  deletedSelectedElements() {
    let selectedEles = this.cy.$(':selected');
    if (selectedEles.empty()) {
      selectedEles = this.cy.elements();
    }

    const deletedEls = selectedEles.remove();
    this.bus.emit('deletedSelectedElements', deletedEls);
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
  async fetchGeneList(geneSetNames) {
    geneSetNames = geneSetNames || [];
    const nameSet = new Set(geneSetNames);

    if(this.lastGeneSet1 && _.isEqual(this.lastGeneSetNames1, nameSet)) {
      return this.lastGeneSet1;
    }
    if(this.lastGeneSet2 && _.isEqual(this.lastGeneSetNames2, nameSet)) {
      return this.lastGeneSet2;
    }

    // New query...
    const res = await fetch(`/api/${this.networkIDStr}/genesets`, {
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

      // We cache the last two queries because clicking on an 
      // edge queries for both source/target nodes.
      this.lastGeneSet2 = this.lastGeneSet1;
      this.lastGeneSetNames2 = this.lastGeneSetNames1;

      this.lastGeneSet1 = geneSet;
      this.lastGeneSetNames1 = nameSet;

      return geneSet;
    }
  }
}
