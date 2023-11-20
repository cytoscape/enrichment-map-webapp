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
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: HEADER_HEIGHT,
  },
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
  const [ bgColor, setBgColor ] = useState('white');

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

const Main = ({
  controller,
  openLeftDrawer,
  openBottomDrawer,
  isMobile,
  onContentClick,
  onCloseLeftDrawer,
  onToggleBottomDrawer
}) => {
  const classes = useStyles();

  const shiftXCy = openLeftDrawer && !isMobile;
  const shiftYCy = openBottomDrawer;

  return (
    <div className={classes.root} onClick={onContentClick}>
      <LeftDrawer
        open={openLeftDrawer}
        isMobile={isMobile}
        controller={controller}
        onClose={onCloseLeftDrawer}
      />
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
        open={openBottomDrawer}
        isMobile={isMobile}
        leftDrawerOpen={openLeftDrawer}
        onToggle={onToggleBottomDrawer}
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
  openLeftDrawer: PropTypes.bool.isRequired,
  openBottomDrawer: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  onContentClick: PropTypes.func.isRequired,
  onCloseLeftDrawer: PropTypes.func.isRequired,
  onToggleBottomDrawer: PropTypes.func,
};

export default Main;