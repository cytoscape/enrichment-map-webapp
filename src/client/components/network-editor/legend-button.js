import React, { useEffect, useReducer, useState } from 'react';
import PropTypes from 'prop-types';
import { saveAs } from 'file-saver';
import { makeStyles } from '@material-ui/core/styles';
import { NodeColorLegend, getSVGString } from './legend-svg';
import { NetworkEditorController } from './controller';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import { Tooltip } from '@material-ui/core';
import EventEmitterProxy from '../../../model/event-emitter-proxy';

export const NODE_COLOR_SVG_ID = 'node-color-legend-svg';

const LEGEND_HEIGHT = 200;
const LEGEND_WIDTH  = 160;
const BACKGROUND_COLOR  = '#F6F6F6';
const BORDER_COLOR = '#bbb';
const BUTTON_ICON_COLOR = '#999';

const useStyles = makeStyles((theme) => ({
  menu: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    padding: '17px 15px',
    width: '39px',
    height: '39px',
    fontSize: '13px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
    color: '#464448',
    overflow: 'hidden',
    border: '1px solid ' + BORDER_COLOR,
    background: BACKGROUND_COLOR,
    borderRadius: '50%',
    boxShadow: '0 3px 10px -2px rgba(0, 0, 0, 0.25)',
    transition: '0.2s',
    zIndex: 20, 
  },
  menuOpen: {
    background: BACKGROUND_COLOR,
    border: '1px solid ' + BORDER_COLOR,
    width: LEGEND_WIDTH + 'px',
    height: LEGEND_HEIGHT + 'px',
    borderRadius: '2px'
  },
  menuButton: {
    fontWeight: 400,
    border: 0,
    background: 'none',
    color: BUTTON_ICON_COLOR,
    position: 'absolute',
    top: '7px',
    right: '10px',
    fontSize: '34px',
    padding: 0,
    width: '20px',
    height: '20px',
    lineHeight: '12px',
    transition: '0.2s',
    userSelect: 'none'
  },
  menuButtonOpen: {
    top: '16px',
    color: BUTTON_ICON_COLOR,
    transform: 'rotate(180deg)'
  },
  menuTitle: {
    fontSize: '12px',
    margin: '0 0 13px 0'
  },
  menuContent: {
    opacity: 0,
    visibility: 'hidden',
    transition: '0.2s'
  },
  menuContentOpen: {
    opacity: 1,
    visibility: 'visible',
  },
}));


async function exportLegend(svgID) {
  const svg = getSVGString(svgID);
  const blob = new Blob([svg], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, 'enrichment_map_legend.svg');
}


export function LegendActionButton({ controller }) {
  const { cy } = controller;

  const [ open, toggleOpen ] = useReducer(x => !x, true);
  const [ loading, setLoaded ] = useReducer(() => false, true);
  const [ nes, setNes ] = useState();

  useEffect(() => {
    if (controller.isNetworkLoaded())
      setLoaded();
    controller.bus.on('networkLoaded', setLoaded);
    return () => controller.bus.removeListener('networkLoaded', setLoaded);
  }, []);

  useEffect(() => {
    const cyEmitter = new EventEmitterProxy(cy);
    cyEmitter.on('select unselect', () => {
      const eles = cy.nodes(':selected');
      if(eles.length > 0) {
        const ele = eles[eles.length - 1];
        setNes(ele.data('NES'));
      } else {
        setNes();
      }
    });
    return () => cyEmitter.removeAllListeners();
  }, []);

  const classes = useStyles();
  const menuClasses = `${classes.menu} ${open ? classes.menuOpen : ''}`;
  const buttonClasses = `${classes.menuButton} ${open ? classes.menuButtonOpen : ''}`;
  const contentClasses = open ? classes.menuContentOpen : classes.menuContent;

  return loading ? null : (
    <div className={menuClasses} onClick={open ? undefined : toggleOpen}>
      <div className={buttonClasses} onClick={open ? toggleOpen : undefined}>
        <Tooltip title={open ? '' : 'Show Legend'} arrow placement='left'>
          <KeyboardArrowUpIcon />
        </Tooltip>
      </div>
      <div className={contentClasses}>
        <h4 className={classes.menuTitle}>Enrichment (NES)</h4>
        <NodeColorLegend 
          svgID={nodeSvgID}
          height={LEGEND_HEIGHT * 0.75}
          magNES={controller.style.magNES}
          nesVal={nes}
        />
      </div>
    </div>
  );
}

LegendActionButton.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
};

export default LegendActionButton;