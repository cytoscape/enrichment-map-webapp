import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import MiniSearch from 'minisearch';
import _ from 'lodash';


export function parsePathwayName(pathway) {
  let name = pathway;
  const i = name.indexOf('%');
  if (i > 0) {
    name = name.substring(0, i);
  }
  return name.toUpperCase().replace(/_/g, ' ');
}


export class SearchController {

  constructor(cy, bus) {
    this.cy = cy;
    this.networkIDStr = cy.data('id');
    this.bus = bus || new EventEmitter();

    this.genesReady = false;
    this.pathwaysReady = false;

    this.bus.on('networkLoaded', () => {
      Promise.all([
        this.fetchAllGenesInNetwork(),
        this.fetchAllPathwaysInNetwork(),
      ]).then(() => {
        this.genesReady = true;
        this.bus.emit('geneListIndexed');
      });
    });
  }

  isGeneListIndexed() {
    return this.genesReady;
  }

  isPathwayListIndexed() {
    return this.pathwaysReady;
  }

  /**
   * Fetches all ranked genes in the network.
   * Note: pathways usually contain genes that are not in the user's gene list, these genes do not have ranks
   * and are not returned by the endpoint
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

      ({pathwayGenes : this.pathwayGenes, geneRanks: this.geneRanks} = this._createMaps(documents));
    }
  }


  _createMaps(documents) {
    const pathwayGenes = new Map();
    const geneRanks = new Map();

    for(const doc of documents || []) {
      const { gene, rank } = doc;
      geneRanks.set(gene, rank);
      for(const pathway of doc.pathwayNames || []) {
        if(pathwayGenes.has(pathway)) {
          pathwayGenes.get(pathway).push(gene);
        } else {
          pathwayGenes.set(pathway, [gene]);
        }
      }
    }
    return { pathwayGenes, geneRanks };
  }


  queryPathwayGenes(pathways, intersection = false) {
    const { pathwayGenes, geneRanks } = this;

    if(pathways === undefined || pathways.length == 0) {
      pathways = [...pathwayGenes.keys()];
    }

    const result = new Set(pathwayGenes.get(pathways[0]));

    for(const pathway of pathways.slice(1)) { 
      if(intersection) {
        const genes = new Set(pathwayGenes.get(pathway));
        for(const gene of result) {
          if(!genes.has(gene)) {
            result.delete(gene);
          }
        }
      } else {
        const genes = pathwayGenes.get(pathway);
        genes.forEach(g => result.add(g));
      }
    }

    const genesWithRanks = [...result].map(gene => ({ gene, rank: geneRanks.get(gene) }));
    return _.orderBy(genesWithRanks, 'rank', 'desc');
  }


  /**
   * Fetches all the pathways in the network.
   * Note this includes all the genes in the pathway, which likely contains genes that are not
   * in the user's gene list.
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