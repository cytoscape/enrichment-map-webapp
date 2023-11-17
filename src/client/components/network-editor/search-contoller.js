import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import MiniSearch from 'minisearch';



export function parsePathwayName(pathway) {
  let name = pathway;
  const i = name.indexOf('%');
  if (i > 0) {
    name = name.substring(0, i);
  }
  return name.toLowerCase().replace(/_/g, ' ');
}


export class SearchController {

  constructor(cy, bus) {
    this.cy = cy;
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
      const nodes = this.cy.pathwayNodes();
      
      documents.forEach(doc => {
        const pathway = doc.name;
        doc.name = parsePathwayName(pathway);
        // Add other required data fields to Cytoscape nodes
        OUTER:
        for (const n of nodes) {
          const pathways = n.data('name');
          if (pathways) {
            for (const p of pathways) {
              if (pathway === p) {
                n.data('genes', doc.genes.sort());
                break OUTER;
              }
            }
          }
        }
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
      return this.pathwayMiniSearch.search(query, { fields: ['name', 'description', 'genes'], prefix: true });
    }
    return [];
  }
}