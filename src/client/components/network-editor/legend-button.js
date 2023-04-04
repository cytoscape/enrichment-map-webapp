import React, { useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import { NodeColorLegend } from './legend-svg';
import { NetworkEditorController } from './controller';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import { Tooltip } from '@material-ui/core';

export const NODE_COLOR_SVG_ID = 'node-color-legend-svg';

const LEGEND_HEIGHT = 220;
const LEGEND_WIDTH  = 120;
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


export function LegendActionButton({ controller }) {
  const [ open, toggleOpen ] = useReducer(x => !x, true);
  const [ loading, setLoaded ] = useReducer(() => false, true);

  useEffect(() => {
    if (controller.isNetworkLoaded())
      setLoaded();
    controller.bus.on('networkLoaded', setLoaded);
    return () => controller.bus.removeListener('networkLoaded', setLoaded);
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
        <h4 className={classes.menuTitle}>Legend</h4>
        <NodeColorLegend 
          svgID={NODE_COLOR_SVG_ID}
          height={LEGEND_HEIGHT * 0.75}
          magNES={controller.style.magNES} 
        />
      </div>
    </div>
  );
}

LegendActionButton.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
};

export default LegendActionButton;