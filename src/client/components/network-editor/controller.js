import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import _ from 'lodash';
import MiniSearch from 'minisearch';
import { DEFAULT_PADDING } from './defaults';

/**
 * The network editor controller contains all high-level model operations that the network
 * editor view can perform.
 *
 * @property {Cytoscape.Core} cy The graph instance
 * @property {EventEmitter} bus The event bus that the controller emits on after every operation
 * @property {Number} minRank The minimum rank value of the current network
 * @property {Number} maxRank The maximum rank value of the current network
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
  applyLayout(options) {
    if (this.layout) {
      this.layout.stop();
    }

    // Save the values of the last used layout options
    const { name } = options;
    this.layoutOptions[name] = options;
    // Apply the layout
    this.layout = this.cy.layout(options);
    this.layout.run();
  }

  /**
   * Returns the last used layout options for the passed layout name,
   * or the default values if the layout has not been applied yet.
   * @param {String} name the layout algorithm name (not the layout label!)
   * @return {Any} object with the layout options, including the layout 'name',
   *               or an empty object if the name is not supported
   */
  getLayoutOptions(name) {
    return Object.assign({}, this.layoutOptions[name]);
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

      this.lastGeneSet = res;
      this.lastGeneSetNames = [];
      this.geneListIndexed = true;
      this.bus.emit('geneListIndexed');
    }
  }

  async fetchGeneList(geneSetNames) {
    geneSetNames = geneSetNames || [];
    const nameSet = new Set(geneSetNames);

    if (this.lastGeneSet == null || !_.isEqual(this.lastGeneSetNames, nameSet)) {
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
        
        this.lastGeneSet = geneSet;
        this.lastGeneSetNames = nameSet;
        return geneSet;
      }
    } else {
      return this.lastGeneSet;
    }
  }
}
