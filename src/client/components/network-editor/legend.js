import React, { useEffect, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';

import { NetworkEditorController } from './controller';

import { makeStyles } from '@material-ui/core/styles';
import Cytoscape from 'cytoscape';
import { saveAs } from 'file-saver';

import DEFAULT_NETWORK_STYLE from './network-style';

import { LinearProgress } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  cyContainer: {
    backgroundColor: '#f5f5f5',
    padding: 0,
  },
  progressBar: {
    backgroundColor: theme.palette.secondary.main,
    height: 6,
  },
}));

function createCy(maxQVal) {
  const cy = new Cytoscape({
    headless: true,
    styleEnabled: true,
    boxSelectionEnabled: false,
    zoomingEnabled: false,
    panningEnabled: false,

    style: [ 
      ...DEFAULT_NETWORK_STYLE(0.1, 0.2),
      { selector: 'node',
        style: {
          'width': 25,
          'height': 25
      }},
      { selector: 'node[label]',
        style: {
          'label': 'data(label)',
          'font-size': '12px',
          'text-wrap': 'none',
          'background-opacity': 0,
          'border-opacity': 0,
          'width': 1,
          'text-valign': 'center',
          'text-halign': 'right',
          'color': '#000',
          'text-outline-opacity': 0
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
          'width': 8,
          'height': 8
      }},
    ],

    elements: [
      { data: { id: 'a' } },
      { data: { id: 'a-lab', label: 'Node:' } },
      { data: { id: 'a-exp', label: 'Gene Set:' } },

      { data: { id: 'b', padj: 0.1 } },
      { data: { id: 'b-lab', label: 'Node Color:' } },
      { data: { id: 'b-exp', label: `q-value, brighter is more sig.` } },

      { data: { id: 'e-source', hidden: true } },
      { data: { id: 'e-target', hidden: true } },
      { data: { id: 'e', source: 'e-source', target: 'e-target' } },
      { data: { id: 'e-lab', label: 'Edge Width:' } },
      { data: { id: 'e-exp', label: 'Gene Set Overlap' } },

      { data: { id: 'p' } },
      { data: { id: 'p-1', parent: 'p', child: true } },
      { data: { id: 'p-2', parent: 'p', child: true } },
      { data: { id: 'p-3', parent: 'p', child: true } },
      { data: { id: 'p-lab', label: 'Cluster:' } },
      { data: { id: 'p-exp', label: 'Gene Sets with High Overlap' } },
    ],
  });

  cy.elements().forEach(ele => {
    if (!ele.data('name'))
      ele.data('name', '');
  });

  cy.mount(document.getElementById('cy-style-legend'));
  cy.resize();
  cy.nodes().ungrabify();

  // Have to manually position because this needs to run after the mount/resize.
  const pos = (col, row) => {
    const xs = [30, 60, 140];
    const padTop = 25, ySep = 35;
    return { x: xs[col], y: padTop + row * ySep };
  };
  
  let row = 0;
  cy.nodes('#a').position(pos(0,row));
  cy.nodes('#a-lab').position(pos(1,row));
  cy.nodes('#a-exp').position(pos(2,row));

  row++;
  cy.nodes('#b').position(pos(0,row));
  cy.nodes('#b-lab').position(pos(1,row));
  cy.nodes('#b-exp').position(pos(2,row));

  row++;
  const epos = pos(0,row);
  cy.nodes('#e-source').position({ x: epos.x-15, y: epos.y+12 });
  cy.nodes('#e-target').position({ x: epos.x+15, y: epos.y-12 });
  cy.nodes('#e-lab').position(pos(1,row));
  cy.nodes('#e-exp').position(pos(2,row));

  row++;
  const cpos = pos(0,row);
  cy.nodes('#0').position(pos(0,row));
  cy.nodes('#p-1').position({ x: cpos.x-8,  y: cpos.y+6 });
  cy.nodes('#p-2').position({ x: cpos.x+12, y: cpos.y+2 });
  cy.nodes('#p-3').position({ x: cpos.x+2,  y: cpos.y-4 });
  cy.nodes('#p-lab').position(pos(1,row));
  cy.nodes('#p-exp').position(pos(2,row));

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

export function StyleLegend({ controller, width, height }) {
  const cyRef = useRef();
  const [ loading, setLoaded ] = useReducer(() => false, true);

  useEffect(() => {
    if (!loading) {
      const maxQVal = controller.cy.data('maxQVal');
      cyRef.current = createCy(maxQVal); 
    }
  }, [loading]); 

  useEffect(() => {
    const handleExport = scale => exportLegend(cyRef.current, scale);
    
    if (controller.isNetworkLoaded()) {
      setLoaded(true);
    }

    controller.bus.on('networkLoaded', setLoaded);
    controller.bus.on('exportLegend', handleExport);

    return () => {
      controller.bus.removeListener('networkLoaded', setLoaded);
      controller.bus.removeListener('exportLegend', handleExport);
    };
  }, []);

  const classes = useStyles();

  return (
    <div className={classes.legend}>
        <div className={classes.cyContainer}>
          <div id='cy-style-legend' style={{width: width, height: height}}>
            {loading && (
              <LinearProgress className={classes.progressBar} />
            )}
          </div>
        </div>
    </div>
  );
}

StyleLegend.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};

export default StyleLegend;