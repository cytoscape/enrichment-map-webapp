import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { NetworkEditorController } from './controller';
import theme from '../../theme';
import { makeStyles } from '@material-ui/core/styles';
import Cytoscape from 'cytoscape';
import { saveAs } from 'file-saver';

import DEFAULT_NETWORK_STYLE from './network-style';


const useStyles = makeStyles((theme) => ({
  parent: {
    position: 'relative'
  },
  legend: {
    zIndex: 1,
    position: 'fixed',
    right: '20px',
    bottom: '20px',
    height: '250px',
    backgroundColor: '#AAA',
    color: 'white',
    padding: '5px',
    width: '350px',
    border: 'solid black'
  }
}));


function createCy() {
  const cy = new Cytoscape({
    headless: true,
    styleEnabled: true,
    boxSelectionEnabled: false,
    zoomingEnabled: false,
    panningEnabled: false,

    style: [ 
      ...DEFAULT_NETWORK_STYLE,
      { selector: 'node[label]',
        style: {
          'label': 'data(label)',
          'font-size': '18px',
          'text-wrap': 'none',
          'background-opacity': 0,
          'border-opacity': 0,
          'width': 1,
          'text-valign': 'center',
          'text-halign': 'right'
      }},
      { selector: '#b', 
        style: {
          'background-color': 'lightblue',
      }},
      { selector: '#c',
        style: {
          'font-size': '12px',
      }},
      { selector: 'node[hidden]', 
        style: {
          'opacity': 0,
          'width': 2,
          'height': 2
      }},
      { selector: '#e',
        style: {
          'width': 5
      }},
      { selector: 'node[child]',
        style: {
          'width': 5,
          'height': 5
      }},
    ],

    elements: [
      { data: { id: 'a' } },
      { data: { id: 'a-lab', label: 'Nodes' } },
      { data: { id: 'a-exp', label: 'Gene Sets' } },

      { data: { id: 'b' } },
      { data: { id: 'b-lab', label: 'Node Color' } },
      { data: { id: 'b-exp', label: 'q-value' } },

      { data: { id: 'c', name: 'Label' } },
      { data: { id: 'c-lab', label: 'Node Label' } },
      { data: { id: 'c-exp', label: 'Gene Set Name' } },

      { data: { id: 'e-source', hidden: true } },
      { data: { id: 'e-target', hidden: true } },
      { data: { id: 'e', source: 'e-source', target: 'e-target' } },
      { data: { id: 'e-lab', label: 'Edge Width' } },
      { data: { id: 'e-exp', label: 'Similarity' } },

      { data: { id: 'p' } },
      { data: { id: 'p-1', parent: 'p', child: true } },
      { data: { id: 'p-2', parent: 'p', child: true } },
      { data: { id: 'p-3', parent: 'p', child: true } },
      { data: { id: 'p-lab', label: 'Clusters' } },
      { data: { id: 'p-exp', label: 'Pathways' } },
    ],
  });

  cy.mount(document.getElementById('cy-style-legend'));
  cy.resize();
  cy.nodes().ungrabify();

  // Have to manually position because this needs to run after the mount/resize.
  const pos = (row, col) => {
    const xs = [25, 55, 185];
    const padTop = 25, ySep = 45;
    return { x: xs[col], y: padTop + row * ySep };
  };
  
  cy.nodes('#a').position(pos(0,0));
  cy.nodes('#a-lab').position(pos(0,1));
  cy.nodes('#a-exp').position(pos(0,2));

  cy.nodes('#b').position(pos(1,0));
  cy.nodes('#b-lab').position(pos(1,1));
  cy.nodes('#b-exp').position(pos(1,2));

  cy.nodes('#c').position(pos(2,0));
  cy.nodes('#c-lab').position(pos(2,1));
  cy.nodes('#c-exp').position(pos(2,2));

  const epos = pos(3,0);
  cy.nodes('#e-source').position({ x: epos.x-15, y: epos.y+12 });
  cy.nodes('#e-target').position({ x: epos.x+20, y: epos.y-12 });
  cy.nodes('#e-lab').position(pos(3,1));
  cy.nodes('#e-exp').position(pos(3,2));

  const cpos = pos(4,0);
  cy.nodes('#0').position(pos(4,0));
  cy.nodes('#p-1').position({ x: cpos.x-8,  y: cpos.y+6 });
  cy.nodes('#p-2').position({ x: cpos.x+10, y: cpos.y   });
  cy.nodes('#p-3').position({ x: cpos.x+5,  y: cpos.y-4 });
  cy.nodes('#p-lab').position(pos(4,1));
  cy.nodes('#p-exp').position(pos(4,2));

  return cy;
}


async function exportLegend(cy, scale) {
  const blob = await cy.png({
    output:'blob-promise',
    bg: 'white',
    scale
  });
  saveAs(blob, 'enrichment_map_legend.png');
}


export function StyleLegend({ controller }) {
  const cyRef = useRef();
  
  useEffect(() => { cyRef.current = createCy(); }, []);

  useEffect(() => { 
    const handleExport = scale => exportLegend(cyRef.current, scale);
    controller.bus.on('exportLegend', handleExport);
    return () => {
      controller.bus.removeListener('exportLegend', handleExport);
    };
  }, []);

  const classes = useStyles();

  return (
      <div className={classes.parent}>
        <div id='cy-style-legend' className={classes.legend} />
      </div>
  );
}

StyleLegend.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
};

export default StyleLegend;