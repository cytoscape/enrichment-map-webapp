import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import _ from 'lodash';
import MiniSearch from 'minisearch';

export class SearchController {

  constructor(cy, bus) {
    this.networkIDStr = cy.data('id');
    this.bus = bus || new EventEmitter();

    this.genesReady = false;
    this.pathwaysReady = false;

    this.bus.on('networkLoaded', () => {
      this.fetchAllGenesInNetwork();
    });
  }

  isGeneListIndexed() {
    return this.genesReady;
  }

  /**
   * Fetches all the genes in the network.
   */
  async fetchAllGenesInNetwork() {
    const res = await fetch(`/api/${this.networkIDStr}/genesforsearch`);

    if (res.ok) {
      this.geneMiniSearch = new MiniSearch({
        idField: 'gene',
        fields: ['gene'],
        storeFields: ['gene', 'rank', 'pathwayNames']
      });

      const documents = await res.json();
      this.geneMiniSearch.addAll(documents);

      this.genesReady = true;
      this.bus.emit('geneListIndexed');
    }
  }

  searchGenes(query) {
    if (!this.isGeneListIndexed()) {
      throw "The gene list hasn't been fecthed yet!";
    }
    if (query && query.length > 0) {
      return this.geneMiniSearch.search(query, { fields: ['gene'], prefix: true });
    }
    return [];
  }
}