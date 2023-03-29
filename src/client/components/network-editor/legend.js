import React, { useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import { Typography } from '@material-ui/core';
import { saveAs } from 'file-saver';
import { NetworkEditorController } from './controller';
import { NodeColorLegend, EdgeWidthLegend, getSVGString } from './legend-svg';


async function exportLegend(svgTagID) {
  const svg = getSVGString(svgTagID);
  console.log("here");
  console.log(svg);
  const blob = new Blob([svg], {type: "text/plain;charset=utf-8"});
  saveAs(blob, 'enrichment_map_legend.svg');
}


const useStyles = makeStyles((theme) => ({
  legend: {
    backgroundColor: '#f0f0f0',
    padding: 0,
    display: 'flex',
  },
  legendSection: {
  },
  loading: {
    padding: 10
  },
}));


export function StyleLegend({ controller, width=100, height=100 }) {
  const [ loading, setLoaded ] = useReducer(() => false, true);

  console.log("width " + width);
  console.log("Height:" + height);

  useEffect(() => {
    const handleExport = () => exportLegend('node-color-legend-svg');
    console.log("register exportLegend listener");
    controller.bus.on('exportLegend', handleExport);
    return () => {
      console.log("unregister exportLegend listener");
      controller.bus.removeListener('exportLegend', handleExport);
    };
  }, []);

  useEffect(() => {
    if (controller.isNetworkLoaded()) {
      setLoaded();
    }
    controller.bus.on('networkLoaded', setLoaded);
    return () => controller.bus.removeListener('networkLoaded', setLoaded);
  }, []);

  const classes = useStyles();

  const Loading = () => 
    <div className={classes.loading}>
      <Typography>Loading...</Typography>
    </div>;

  const Legend = () =>
    <div className={classes.legend}>
      <div className={classes.legendSection}>
        <NodeColorLegend svgID='node-color-legend-svg' width={width/2} height={height} magNES={controller.style.magNES} /> 
      </div>
      <div className={classes.legendSection}>
        <EdgeWidthLegend svgID='edge-width-legend-svg' width={width/2} height={height} />
      </div>
    </div>;

  return (
    <div style={{width, height}}>
      { loading 
        ? <Loading />
        : <Legend />
      }
    </div>
  );
}

StyleLegend.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};

export default StyleLegend;