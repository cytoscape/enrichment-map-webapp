import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { NetworkEditorController } from './controller';
import _ from 'lodash';

export class GeneListPanel extends Component {

  constructor(props) {
    super(props);
    this.controller = props.controller;
    this.networkIDStr = props.controller.cy.data('id');

    this.state = {
      genes: [],
    };

    this.selectionHandler = (event) => {
      const node = event.target;
      const geneSet = node.data('name');
      this.fetchGeneListWithRanks(geneSet);
    };

    this.controller.cy.on('select', 'node', this.selectionHandler);
  }

  componentWillUnmount() {
    this.controller.cy.removeListener('select', 'node', this.selectionHandler);
  }

  // fetchGeneList(geneSetName) {
  //   fetch(`/api/geneset/${encodeURIComponent(geneSetName)}`)
  //     .then(res => res.json())
  //     .then(({ name, description, genes }) => this.setState({ name, description, genes }));
  // }

  fetchGeneListWithRanks(geneSetName) {
    fetch(`/api/${this.networkIDStr}/geneset/${encodeURIComponent(geneSetName)}`)
      .then(res => res.json())
      .then(({ name, description, genes }) => {
        genes = _.sortBy(genes, ["rank", "gene"]);
        // genes = _.orderBy(genes, ["rank", "gene"], ["desc", "asc"]);
        this.setState({ name, description, genes });
      });
  }

  render() {
    console.log("genes: " + JSON.stringify(this.state.genes));
    return <div>
      <div>
        Gene Set: {this.state.name}
      </div>
      <hr/>
      <div>
        Description: {this.state.description}
      </div>
      <hr/>
      {/* <div>
        Genes:
        <div>
            { this.state.genes.map(gene =>
              <div key={gene}>{gene}</div>
            )}
        </div>
      </div> */}
      <div>
        Genes:
        <div>
            { this.state.genes.map(({gene, rank}) =>
              <div key={gene}>{gene} { rank ? "(" + rank + ")" : null }</div>
            )}
            {/* { this.state.genes.map(({gene, rank}) =>
              {rank ? <div>{rank}</div> : null; }
            )} */}
        </div>
      </div>
    </div>;
  }
}

GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
};

export default GeneListPanel;