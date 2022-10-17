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
  }

  /**
   * Stops the currently running layout, if there is one, and apply the new layout options.
   * @param {*} options
   */
  applyLayout() {
    if (this.layout) {
      this.layout.stop();
    }

    // Save the values of the last used layout options
    const fcoseOptions = {
      name: 'fcose',
      idealEdgeLength: 100,
      nodeSeparation: 150,
      animate: false,
      padding: DEFAULT_PADDING
    };

    // this.cy.nodes().children().move({ parent: null });

    let clusterN = 1;
    let clusterNameToIntID = new Map();

    const clusterIntID = node => {
      const clusterName = node.data('mcode_cluster_id');
      const hasExistingID = clusterNameToIntID.has(clusterName);
      const hasClusterName = clusterName != null && clusterName !== '';
      
      if (!hasClusterName) {
        return null;
      } else if (hasExistingID) {
        return clusterNameToIntID.get(clusterName);
      } else {
        const id = clusterN;

        clusterNameToIntID.set(clusterName, id);
        clusterN += 1;

        return id;
      }
    };

    const ciseOptions = {
      name: 'cise',
      clusters: clusterIntID,
      idealInterClusterEdgeLengthCoefficient: 6.5
    };

    // parents.restore();

    const options = ciseOptions;

    const getClusterName = node => node.data('mcode_cluster_id');
    const hasACluster = node => getClusterName(node) != null;
    
    const edgeIsWithinCluster = edge => {
      const srcClusterName = getClusterName(edge.source());
      const tgtClusterName = getClusterName(edge.target());

      return srcClusterName != null && srcClusterName === tgtClusterName;
    };

    const nodes = this.cy.nodes();

    nodes.orphans().filter(node => {
      if (node.isParent()) {
        return false; // leave top-level cluster nodes
      } else if (node.connectedEdges().empty()) {
        return true; // remove disconnected nodes
      } else if (_.uniq(node.neighborhood().nodes().map(getClusterName).filter(clusterName => clusterName != null)).length >= 2) {
        return false; // leave nodes that connect clusters
      } else {
        return true; // remove nodes that aren't connecting clusters 
      }
    }).remove();

    const edges = this.cy.edges();
    const withinClusterEdges = edges.filter(edgeIsWithinCluster);

    withinClusterEdges.addClass('within-cluster');

    // Apply the layout
    this.layout = this.cy.layout(options);
    this.layout.run();

    edges.not(withinClusterEdges).forEach(edge => {
      const src = edge.source();
      const tgt = edge.target();

      edge.move({
        source: src.isChild() ? src.parent().id() : src.id(),
        target: tgt.isChild() ? tgt.parent().id() : tgt.id()
      });
    });

    this.cy.fit(DEFAULT_PADDING);
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
}
