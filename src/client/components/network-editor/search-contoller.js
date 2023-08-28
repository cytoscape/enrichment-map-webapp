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
      this.fetchAllPathwaysInNetwork();
    });
  }

  isGeneListIndexed() {
    return this.genesReady;
  }

  isPathwayListIndexed() {
    return this.pathwaysReady;
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

  /**
   * Fetches all the genes in the network.
   */
  async fetchAllPathwaysInNetwork() {
    const res = await fetch(`/api/${this.networkIDStr}/pathwaysforsearch`);

    if (res.ok) {
      // TODO add 'description' and 'leadingEdge'
      this.pathwayMiniSearch = new MiniSearch({
        idField: 'name',
        fields: ['name', 'genes', 'description'],
        storeFields: ['name', 'padj', 'NES', 'pval', 'size', 'genes', 'description', 'mcode_cluster_id']
      });

      const documents = await res.json();
      
      documents.map(doc => {
        const i = doc.name.indexOf('%');
        if(i > 0) {
          doc.name = doc.name.substring(0, i);
        }
        doc.name = doc.name.toLowerCase();
        return doc;
      });

      this.pathwayMiniSearch.addAll(documents);

      this.pathwaysReady = true;
      this.bus.emit('pathwayListIndexed');
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

  searchPathways(query) {
    if (!this.isPathwayListIndexed()) {
      throw "The pathway list hasn't been fecthed yet!";
    }
    if (query && query.length > 0) {
      return this.pathwayMiniSearch.search(query, { fields: ['name'], prefix: true });
    }
    return [];
  }
}