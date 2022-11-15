import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { CONTROL_PANEL_WIDTH } from './defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import LeftDrawer from './left-drawer';

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  cy: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    background: '#fff',
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  cyShift: {
    width: `calc(100% - ${CONTROL_PANEL_WIDTH}px)`,
    marginLeft: CONTROL_PANEL_WIDTH,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
}));

const NetworkBackground = ({ controller }) => {
  const [bgColor, setBgColor] = useState('white');
  
  const busProxy = new EventEmitterProxy(controller.bus);

  useEffect(() => {
    busProxy.on('setNetworkBackgroundColor', (color) => setBgColor(color));

    return function cleanup() {
      busProxy.removeAllListeners();
    };
  }, []);
  
  return <div style={{ position: 'absolute', zIndex: -1, width: '100%', height: '100%', backgroundColor: bgColor }} />;
};

const Main = ({ controller, showControlPanel, isMobile, onContentClick }) => {
  const classes = useStyles();
    
  const shiftCy = showControlPanel && !isMobile;

  return (
    <div
      className="network-editor-content"
      onClick={onContentClick}
    >
      <LeftDrawer open={showControlPanel} isMobile={isMobile} controller={controller} />
      <div className={classes.cy}>
        <div className={clsx(classes.cy, { [classes.cyShift]: shiftCy })}>
          <div id="cy" className={classes.cy} style={{ zIndex: 1, width: '100%', height: '100%' }} />
          <NetworkBackground controller={controller} />
        </div>
      </div>
    </div>
  );
};

NetworkBackground.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
};
Main.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
  showControlPanel: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  onContentClick: PropTypes.func.isRequired,
};

export default Main;