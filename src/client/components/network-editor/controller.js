import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import _ from 'lodash';
import { DEFAULT_PADDING } from './defaults';

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

  async fetchGeneList(geneSetName) {
    if (this.lastGeneSet == null || this.lastGeneSet.name !== geneSetName) {
      // New query...
      const geneSet = await fetch(`/api/${this.networkIDStr}/geneset/${encodeURIComponent(geneSetName)}`)
        .then(res => res.json())
        .then(geneSet => {
          const genes = geneSet.genes;
          geneSet.genes = _.sortBy(genes, ["rank", "gene"]);
          // geneSet.genes = _.orderBy(genes, ["rank", "gene"], ["desc", "asc"]);
          
          return geneSet;
        });

      return this.lastGeneSet = geneSet; // Cache the last geneSet
    } else {
      // Same query as before...
      return this.lastGeneSet;
    }
  }
}
