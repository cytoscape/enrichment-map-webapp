import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { makeStyles } from '@material-ui/core/styles';

import { HEADER_HEIGHT, LEFT_DRAWER_WIDTH, BOTTOM_DRAWER_HEIGHT, bottomDrawerHeight } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import LeftDrawer from './left-drawer';
import BottomDrawer from './bottom-drawer';


const useStyles = makeStyles((theme) => ({
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    background: '#fff',
  },
  cy: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    background: 'inherit',
    height: `calc(100% - ${BOTTOM_DRAWER_HEIGHT}px)`,
    transition: theme.transitions.create(['margin', 'width', 'height'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  cyShiftX: {
    width: `calc(100% - ${LEFT_DRAWER_WIDTH}px)`,
    marginLeft: LEFT_DRAWER_WIDTH,
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
  
  return (
    <div style={{ position: 'absolute', zIndex: -1, width: '100%', height: '100%', backgroundColor: bgColor }} />
  );
};

const Main = ({ controller, showControlPanel, isMobile, onContentClick, onHideControlPanel }) => {
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);
  const classes = useStyles();

  const shiftXCy = showControlPanel && !isMobile;
  const shiftYCy = bottomDrawerOpen;

  const onShowBottomDrawer = (open) => {
    setBottomDrawerOpen(open);
  };

  return (
    <div
      className="network-editor-content"
      onClick={onContentClick}
    >
      <LeftDrawer open={showControlPanel} isMobile={isMobile} controller={controller} onHide={onHideControlPanel} />
      <div className={classes.background}>
        <div
          className={clsx(classes.cy, { [classes.cyShiftX]: shiftXCy })}
          style={shiftYCy ? {height: `calc(100% - ${bottomDrawerHeight()}px)`,} : {}}
        >
          <div id="cy" className={classes.cy} style={{ zIndex: 1, width: '100%', height: '100%' }} />
          <NetworkBackground controller={controller} />
        </div>
      </div>
      <BottomDrawer
        isMobile={isMobile}
        controlPanelVisible={showControlPanel}
        onShowDrawer={onShowBottomDrawer}
        controller={controller}
      />
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
  onHideControlPanel: PropTypes.func.isRequired,
};

export default Main;