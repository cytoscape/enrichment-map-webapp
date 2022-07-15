import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { NetworkEditorController } from './controller';

export class GeneListPanel extends Component {

  constructor(props) {
    super(props);
    this.controller = props.controller;

    this.state = {
      genes: []
    };

    this.selectionHandler = (event) => {
      const node = event.target;
      const geneSet = node.data('name');
      this.fetchGeneList(geneSet);
    };

    this.controller.cy.on('select', 'node', this.selectionHandler);
  }

  componentWillUnmount() {
    this.controller.cy.removeListener('select', 'node', this.selectionHandler);
  }

  fetchGeneList(geneSetName) {
    fetch(`/api/geneset/${encodeURIComponent(geneSetName)}`)
      .then(res => res.json())
      .then(({ name, description, genes }) => this.setState({ name, description, genes }));
  }

  render() {
    return <div>
      <div>
        Gene Set: {this.state.name}
      </div>
      <hr/>
      <div>
        Description: {this.state.description}
      </div>
      <hr/>
      <div>
        Genes:
        <div>
            { this.state.genes.map(gene =>
              <div key={gene}>{gene}</div>
            )}
        </div>
      </div>
    </div>;
  }
}

GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
};