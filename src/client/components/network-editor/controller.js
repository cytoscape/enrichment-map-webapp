import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import _ from 'lodash';
import MiniSearch from 'minisearch';

import { DEFAULT_PADDING } from '../defaults';
import { monkeyPatchMathRandom, restoreMathRandom } from '../../rng';

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
    
    // Save the last used layout optionst
    this.layoutOptions = {
      fcose: {
        name: 'fcose',
        idealEdgeLength: 50,
        nodeSeparation: 75,
        randomize: true,
        animate: false,
        padding: DEFAULT_PADDING
      }
    };

    this.networkLoaded = false;
    this.geneListIndexed = false;

    this.bus.on('networkLoaded', () => {
      this.networkLoaded = true;
      this._indexGeneList();
    });
  }

  isNetworkLoaded() {
    return this.networkLoaded;
  }

  isGeneListIndexed() {
    return this.geneListIndexed;
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

    this.layout = this.cy.layout({
      name: 'cose',
      idealEdgeLength: edge => 50 - 25 * (edge.data('similarity_coefficient')),
      edgeElasticity: edge => 10 / (edge.data('similarity_coefficient')),
      nodeRepulsion: node => 1000,
      // nodeSeparation: 75,
      randomize: true,
      animate: false,
      // padding: DEFAULT_PADDING,
      boundingBox: {
        x1: 0,
        y1: 0,
        x2: 1800,
        y2: 3000
      }
    });

    const onStop = this.layout.promiseOn('layoutstop');

    this.layout.run();

    await onStop;

    restoreMathRandom(); // after the FD layout is done

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


  toggleExpandCollapse(parent, animate=false) {
    const collapsed = parent.data('collapsed');
    const shrinkFactor = 0.2;
    const spacingFactor = collapsed ? (1.0 / shrinkFactor) : shrinkFactor;
    parent.data('collapsed', !collapsed);

    if(!collapsed) {
      parent.children().data('collapsed', "" + !collapsed);
    }
    
    const layout = parent.children().layout({
      name: 'preset',
      positions: node => node.position(),
      fit: false,
      animate,
      spacingFactor
    });
    
    if(collapsed) {
      const onStop = layout.promiseOn('layoutstop');
      onStop.then(() => {
        parent.children().data('collapsed', "" + !collapsed);
      });
    }

    layout.run();
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

      cluster.forEach(node => {
        node.move({ parent: clusterId });
      });
        
      // Create bubble sets
      const edges = cluster.connectedEdges().filter(e => cluster.contains(e.source()) && cluster.contains(e.target()));
      cy.bubbleSets().addPath(cluster, edges, null);
  
      // Collapse all clusters initially
      this.toggleExpandCollapse(parent, false);
  
      parent.on('tap', (event) => {
        if(!event.target.data('parent')) {
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

  searchGenes(query) {
    if (query && query.length > 0) {
      return this.geneMiniSearch.search(query, { fields: ['gene'], prefix: true });
    }
    
    return [];
  }

  getGene(name) {
    if (!this.isGeneListIndexed()) {
      throw "The gene list hasn't been fecthed yet!";
    }

    const res = this.geneMiniSearch.search(name, { fields: ['gene'], prefix: true });

    return res.length > 0 ? res[0] : {};
  }

  async _indexGeneList() {
    const res = await this.fetchGeneList([]);
    const genes = res ? res.genes : [];
    this.minRank = res ? res.minRank : 0;
    this.maxRank = res ? res.maxRank : 0;

    if (genes && genes.length > 0) {
      this.geneMiniSearch = new MiniSearch({
        idField: 'gene',
        fields: ['gene'], // fields to index for full-text search
        storeFields: ['gene', 'rank'] // fields to return with search results
      });
      this.geneMiniSearch.addAll(genes);

      this.lastGeneSet1 = res;
      this.lastGeneSetNames1 = [];
      this.geneListIndexed = true;
      this.bus.emit('geneListIndexed');
    }
  }

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
