import React, { useEffect, useReducer, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { NetworkEditorController } from './controller';
import { makeStyles } from '@material-ui/core/styles';
import Cytoscape from 'cytoscape';
import { saveAs } from 'file-saver';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import { IconButton, LinearProgress } from '@material-ui/core';

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
    backgroundColor: '#999',
    padding: '0px',
    width: '385px',
    border: 'solid black',
  },
  cyContainer: {
    padding: '0px',
  },
  title: {
    height: '40px',
    color: 'black',
    padding: '4px',
    borderBottom: 'solid black',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 'bold'
  },
  cy: {
    height: '190px'
  }
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
          'width': 30,
          'height': 30
      }},
      { selector: 'node[label]',
        style: {
          'label': 'data(label)',
          'font-size': '14px',
          'text-wrap': 'none',
          'background-opacity': 0,
          'border-opacity': 0,
          'width': 1,
          'text-valign': 'center',
          'text-halign': 'right'
      }},
      { selector: '#c',
        style: {
          'font-size': '10px',
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

      { data: { id: 'b', padj: 0.1 } },
      { data: { id: 'b-lab', label: 'Node Color' } },
      { data: { id: 'b-exp', label: `q-value` } },

      { data: { id: 'c', name: 'Label' } },
      { data: { id: 'c-lab', label: 'Node Label' } },
      { data: { id: 'c-exp', label: 'Gene Set Name' } },

      { data: { id: 'e-source', hidden: true } },
      { data: { id: 'e-target', hidden: true } },
      { data: { id: 'e', source: 'e-source', target: 'e-target' } },
      { data: { id: 'e-lab', label: 'Edge Width' } },
      { data: { id: 'e-exp', label: 'Gene Set Overlap' } },

      { data: { id: 'p' } },
      { data: { id: 'p-1', parent: 'p', child: true } },
      { data: { id: 'p-2', parent: 'p', child: true } },
      { data: { id: 'p-3', parent: 'p', child: true } },
      { data: { id: 'p-lab', label: 'Clusters' } },
      { data: { id: 'p-exp', label: 'Gene Sets with High Overlap' } },
    ],
  });

  cy.elements().forEach(ele => {
    if(!ele.data('name'))
      ele.data('name', '');
  });

  cy.mount(document.getElementById('cy-style-legend'));
  cy.resize();
  cy.nodes().ungrabify();

  // Have to manually position because this needs to run after the mount/resize.
  const pos = (col, row) => {
    const xs = [30, 60, 155];
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
  cy.nodes('#c').position(pos(0,row));
  cy.nodes('#c-lab').position(pos(1,row));
  cy.nodes('#c-exp').position(pos(2,row));

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
  cy.nodes('#p-2').position({ x: cpos.x+8, y: cpos.y   });
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


export function StyleLegend({ controller }) {
  const cyRef = useRef();

  const [ open, toggleOpen ] = useReducer(open => !open, true);
  const [ loading, setLoaded ] = useReducer(() => false, true);

  useEffect(() => {
    if(!loading) {
      const maxQVal = controller.cy.data('maxQVal');
      cyRef.current = createCy(maxQVal); 
    }
  }, [loading]); 

  useEffect(() => {
    const handleExport = scale => exportLegend(cyRef.current, scale);
    controller.bus.on('networkLoaded', setLoaded);
    controller.bus.on('exportLegend', handleExport);
    return () => {
      controller.bus.removeListener('exportLegend', handleExport);
      controller.bus.removeListener('networkLoaded', setLoaded);
    };
  }, []);

  const classes = useStyles();

  return (
    <div className={classes.parent}>
      <div className={classes.legend}>
        <div className={classes.title} style={open ? null : { borderBottom: 0 }}>
          <div>
            <div>
              Legend 
              { loading ? <i>&nbsp;(loading...)</i> : null }
            </div>
          </div>
          <IconButton size="small" onClick={toggleOpen} >
            { open ? <KeyboardArrowDownIcon/> : <KeyboardArrowUpIcon/> }
          </IconButton>
        </div>
          <div className={classes.cyContainer} style={open ? null : {height: 0, visibility: 'hidden'}}>
            { loading 
              ? <LinearProgress />
              : <div id='cy-style-legend' className={classes.cy} />  
            }
          </div>
      </div>
    </div>
  );
}

StyleLegend.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
};

export default StyleLegend;