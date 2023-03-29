import React, { useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { saveAs } from 'file-saver';
import { makeStyles } from '@material-ui/core/styles';
import { NodeColorLegend, getSVGString } from './legend-svg';
import { NetworkEditorController } from './controller';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import { Tooltip } from '@material-ui/core';

const LEGEND_HEIGHT = 220;
const LEGEND_WIDTH  = 120;
const BUTTON_COLOR  = '#2b8cbe';

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
    background: BUTTON_COLOR,
    borderRadius: '50%',
    boxShadow: '0 3px 10px -2px rgba(0, 0, 0, 0.25)',
    transition: '0.2s',
    zIndex: 20, 
  },
  menuOpen: {
    background: 'white',
    border: '1px solid #ccc',
    width: LEGEND_WIDTH + 'px',
    height: LEGEND_HEIGHT + 'px',
    borderRadius: '2px'
  },
  menuButton: {
    fontWeight: 400,
    border: 0,
    background: 'none',
    color: 'white',
    position: 'absolute',
    top: '7px',
    right: '11px',
    fontSize: '34px',
    padding: 0,
    width: '20px',
    height: '20px',
    lineHeight: '12px',
    transition: '0.2s',
    userSelect: 'none'
  },
  menuOpenMenuButton: {
    top: '16px',
    color: '#999',
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
  menuOpenMenuContent: {
    opacity: 1,
    visibility: 'visible'
  },
}));


async function exportLegend(svgID) {
  const svg = getSVGString(svgID);
  const blob = new Blob([svg], {type: "text/plain;charset=utf-8"});
  saveAs(blob, 'enrichment_map_legend.svg');
}


export function LegendActionButton({ controller }) {
  const nodeSvgID = 'node-color-legend-svg';

  const [ open, toggleOpen ] = useReducer(x => !x, true);
  const [ loading, setLoaded ] = useReducer(() => false, true);

  useEffect(() => {
    if (controller.isNetworkLoaded())
      setLoaded();
    controller.bus.on('networkLoaded', setLoaded);
    return () => controller.bus.removeListener('networkLoaded', setLoaded);
  }, []);

  useEffect(() => {
    const handleExport = () => exportLegend(nodeSvgID);
    controller.bus.on('exportLegend', handleExport);
    return () => controller.bus.removeListener('exportLegend', handleExport);
  }, []);

  const classes = useStyles();

  if(loading)
    return null;

  const menuClasses = `${classes.menu} ${open ? classes.menuOpen : ''}`;
  const buttonClasses = `${classes.menuButton} ${open ? classes.menuOpenMenuButton : ''}`;
  const contentClasses = open ? classes.menuOpenMenuContent : classes.menuContent;

  return (
    <div className={menuClasses}>
      <div className={buttonClasses} onClick={toggleOpen}>
        <Tooltip title={open ? '' : 'Show Legend'} arrow placement='left'>
          <KeyboardArrowUpIcon />
        </Tooltip>
      </div>
      <div className={contentClasses}>
        <h4 className={classes.menuTitle}>Legend</h4>
        <NodeColorLegend 
          svgID={nodeSvgID}
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