import React, { useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { makeStyles } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import theme from '../../theme';

import tippy, {sticky} from 'tippy.js';

import { CONTROL_PANEL_WIDTH } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import LeftDrawer from './left-drawer';
import ClusterPanel from './cluster-panel';

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
  
  return (
    <div style={{ position: 'absolute', zIndex: -1, width: '100%', height: '100%', backgroundColor: bgColor }} />
  );
};

const Main = ({ controller, showControlPanel, isMobile, onContentClick }) => {
  const classes = useStyles(); 

  const cy = controller.cy;
  const cyEmitter = new EventEmitterProxy(cy);

  const shiftCy = showControlPanel && !isMobile;

  useEffect(() => {
    cyEmitter.on('tap', e => {
      const tappedOnBackground = e.target === cy;

      if (tappedOnBackground) {
         // TODO
      } else if (e.target && e.target.group() === 'nodes') {
        const node = e.target;
        console.log(node.data());
        const popperRef = node.popperRef(); // used only for positioning

        // A dummy element must be passed as tippy only accepts dom element(s) as the target
        // https://atomiks.github.io/tippyjs/v6/constructor/#target-types
        const dummyDomEle = document.createElement('div');

        const tip = new tippy(dummyDomEle, { // tippy props:
          getReferenceClientRect: popperRef.getBoundingClientRect, // https://atomiks.github.io/tippyjs/v6/all-props/#getreferenceclientrect
          trigger: 'manual', // mandatory, we cause the tippy to show programmatically.
          placement: node.data('NES') < 0 ? 'right' : 'left',
          hideOnClick: true,
          interactive: true,
          sticky: "reference",
          appendTo: document.body, // this is necessary to make the tippy interactive (e.g. clickable links)
          plugins: [sticky],
          content: () => { // content prop can be used when the target is a single element https://atomiks.github.io/tippyjs/v6/constructor/#prop
            const div = document.createElement('div');
            const comp = (
              <ThemeProvider theme={theme}>
                <CssBaseline />
                <ClusterPanel node={node} />
              </ThemeProvider>
            );
            ReactDOM.render(comp, div);
            return div;
          },
        });
        
        tip.show();
      }
    });

    return function cleanup() {
      cyEmitter.removeAllListeners();
    };
  }, []);

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