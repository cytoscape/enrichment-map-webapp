import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { NetworkEditorController } from './controller';

export class GeneListPanel extends Component {

  constructor(props) {
    super(props);
    this.controller = props.controller;
    this.networkIDStr = props.controller.cy.data('id');

    this.state = {
      geneSet: null,
    };

    this.selectionHandler = (event) => {
      const node = event.target;
      const geneSetName = node.data('name');
      this.fetchGeneList(geneSetName);
    };
    this.unselectionHandler = () => {
      const eles = this.controller.cy.nodes(':selected');

      if (eles.length === 0) {
        this.setState({ geneSet: null });
      }
    };
  }

  componentDidMount() {
    const eles = this.controller.cy.nodes(':selected');
    
    if (eles.length > 0) {
      const geneSetName = eles[0].data('name');
      this.fetchGeneList(geneSetName);
    }

    this.controller.cy.on('select', 'node', this.selectionHandler);
    this.controller.cy.on('unselect', 'node', this.unselectionHandler);
  }

  componentWillUnmount() {
    this.controller.cy.removeListener('select', 'node', this.selectionHandler);
    this.controller.cy.removeListener('unselect', 'node', this.unselectionHandler);
  }

  async fetchGeneList(geneSetName) {
    const geneSet = await this.controller.fetchGeneList(geneSetName);
    this.setState({ geneSet });
  }

  render() {
    const { geneSet } = this.state;

    return (
      <div>
        {geneSet && (
          <>
            <div>
              Gene Set: {geneSet.name}
            </div>
            <hr/>
            <div>
              Description: {geneSet.description}
            </div>
            <hr/>
            {/* <div>
              Genes:
              <div>
                  { geneSet.genes.map(gene =>
                    <div key={gene}>{gene}</div>
                  )}
              </div>
            </div> */}
            <div>
              Genes:
              <div>
                  { geneSet.genes.map(({gene, rank}) =>
                    <div key={gene}>{gene} { rank ? "(" + rank + ")" : null }</div>
                  )}
                  {/* { geneSet.genes.map(({gene, rank}) =>
                    {rank ? <div>{rank}</div> : null; }
                  )} */}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
}

GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
};

export default GeneListPanel;