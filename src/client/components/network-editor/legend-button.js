import React, { useEffect, useReducer, useState } from 'react';
import PropTypes from 'prop-types';

import { BOTTOM_DRAWER_HEIGHT } from '../defaults';
import EventEmitterProxy from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import { NodeColorLegend } from './legend-svg';

import { makeStyles } from '@material-ui/core/styles';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import { Chip, Tooltip } from '@material-ui/core';

export const NODE_COLOR_SVG_ID = 'node-color-legend-svg';

const LEGEND_HEIGHT = 260;
const LEGEND_WIDTH  = 100;
const BACKGROUND_COLOR  = '#F6F6F6';
const BORDER_COLOR = '#bbb';
const BUTTON_ICON_COLOR = '#999';

const useStyles = makeStyles((theme) => ({
  menu: {
    position: 'absolute',
    bottom: `${20 + BOTTOM_DRAWER_HEIGHT}px`,
    right: '20px',
    padding: '3px 10px',
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
    margin: '6px 0 2px 0',
    textAlign: 'center'
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
  chip: {
    width: '78px',
    height: '15px',
    paddingLeft: '15px',
    margin: '0 0 0 0',
  }
}));


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
  const contentClasses = open ? classes.menuContentOpen : classes.menuContent;

  return loading ? null : (
    <div className={menuClasses} onClick={open ? undefined : toggleOpen}>
      { !open ? null :
        <Chip 
          icon={<KeyboardArrowDownIcon />} 
          onClick={toggleOpen} 
          variant='outlined'
          color='secondary'
          className={classes.chip}
        />
      }
      { open ? null :
        <div className={classes.menuButton} >
          <Tooltip title={open ? '' : 'Show Legend'} arrow placement='left'>
            <KeyboardArrowUpIcon />
          </Tooltip>
        </div>
      }
      <div className={contentClasses}>
        <Tooltip title="Normalized Enrichment Score (NES)" placement='left' arrow>
          <h4 className={classes.menuTitle}>Enrichment</h4>
        </Tooltip>
        <NodeColorLegend 
          svgID={NODE_COLOR_SVG_ID}
          height={LEGEND_HEIGHT * 0.8}
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