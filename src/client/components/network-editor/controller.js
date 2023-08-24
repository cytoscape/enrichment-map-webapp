import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import _ from 'lodash';

import { DEFAULT_PADDING } from '../defaults';
import { monkeyPatchMathRandom, restoreMathRandom } from '../../rng';
import { SearchController } from './search-contoller';

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

    this.layout = this.cy.layout({
      name: 'grid',
      fit: true,
      padding: DEFAULT_PADDING,
      cols: 1,
      sort: (n1, n2) => n2.data('NES') - n1.data('NES'),
      transform: (n, pos) => {
        if      (n.data('NES') > 0) { pos.x += n.width() / 2; }
        else if (n.data('NES') < 0) { pos.x -= n.width() / 2; }
        return pos;
      },
      avoidOverlap: true,
      condense: true,
    });

    const onStop = this.layout.promiseOn('layoutstop');

    this.layout.run();

    await onStop;

    restoreMathRandom(); // after the FD layout is done

    // now that we know the zoom level when the graph fits to screen, we can use restrictions
    this.cy.minZoom(this.cy.zoom() * 0.25);
    this.cy.maxZoom(2);
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
