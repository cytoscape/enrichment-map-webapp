import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import _ from 'lodash';
import { DEFAULT_PADDING } from './defaults';

const MAX_INITIAL_METADATA_CACHE_SIZE = 1000;

/**
 * The network editor controller contains all high-level model operations that the network
 * editor view can perform.
 *
 * @property {Cytoscape.Core} cy The graph instance
 * @property {EventEmitter} bus The event bus that the controller emits on after every operation
 */
export class NetworkEditorController {
  /**
   * Create an instance of the controller
   * @param {Cytoscape.Core} cy The graph instance (model)
   * @param {EventEmitter} bus The event bus that the controller emits on after every operation
   */
  constructor(cy, bus){
    /** @type {Cytoscape.Core} */
    this.cy = cy;

    /** @type {EventEmitter} */
    this.bus = bus || new EventEmitter();

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

    this.metadatadaCache = new Map();
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
    if(selectedEles.empty()) {
      selectedEles = this.cy.elements();
    }

    const deletedEls = selectedEles.remove();
    this.bus.emit('deletedSelectedElements', deletedEls);
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
      if(res.ok) {
        const geneSet = await res.json();
        this.lastGeneSet = geneSet;
        this.lastGeneSetNames = nameSet;
        return geneSet;
      }
    } else {
      return this.lastGeneSet;
    }
  }

  async fetchGeneMetadata(symbol) {
    let md = this.metadatadaCache.get(symbol);

    if (md == null) {
      // New query...
      try {
        const res = await fetch(`https://api.ncbi.nlm.nih.gov/datasets/v1/gene/symbol/${symbol}/taxon/9606`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!res.ok) {
          throw 'Unable to fetch gene metadata';
        }

        const data = await res.json();
        const gene = data.genes[0].gene;
        const geneId = gene['gene_id'];
        const description = gene.description;
        
        md = { geneId, description };
        this.metadatadaCache.set(symbol, md);
        
        return md;
      } catch (error) {
        console.error(error);
        return { error };
      }
    } else {
      console.log(". CACHED: " + symbol);
    }

    return md;
  }

  /**
   * Just fetch gene metadata (description, NCBI id) and save it into the memory cache.
   * @param {Array} genes array of genes.
   */
  prefetchGeneMetadata(genes) {
    if (genes != null) {
      const fetchSymbols = (symbols) => {
        const newSymbols = symbols.filter(s => !this.metadatadaCache.has(s));
        
        if (newSymbols.length === 0) {
          return;
        }
        
        const symbolsStr = newSymbols.join(',');
        console.log("-- Will fetch " + newSymbols.length + " of " + symbols.length);
        console.log(symbolsStr);
    
        try {
          fetch(`https://api.ncbi.nlm.nih.gov/datasets/v1/gene/symbol/${symbolsStr}/taxon/9606`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
          .then(res => {
            return res.ok ? res.json() : {};
          })
          .then(data => {
            if (data.genes && data.genes.length > 0) {
              console.log('\t-- Fetched: ' + data.genes.length);
              data.genes.forEach(entry => {
                const gene = entry.gene;
                const md = { geneId: gene['gene_id'], description: gene.description };
                this.metadatadaCache.set(gene.symbol, md);
              });
            }
          })
          .catch(err => console.error(err));
        } catch (err) {
          console.error(err);
        }
      };

      const chunkSize = 10;
      const total = Math.min(genes.length, MAX_INITIAL_METADATA_CACHE_SIZE);

      for (let i = 0; i < total; i += chunkSize) {
          const chunk = genes.slice(i, i + chunkSize);
          const symbols = chunk.map(obj => obj.gene);
          fetchSymbols(symbols);
      }
    }
  }
}
