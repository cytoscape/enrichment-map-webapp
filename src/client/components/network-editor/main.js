import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { CONTROL_PANEL_WIDTH } from './defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import SearchField from './search-field';
import { GeneListPanel } from './gene-list-panel';

import { withStyles } from '@material-ui/core/styles';

import { Drawer, Divider, List } from '@material-ui/core';

export class Main extends Component {

  constructor(props) {
    super(props);

    this.controller = this.props.controller;
    this.cy = this.controller.cy;
    this.cyEmitter = new EventEmitterProxy(this.cy);
  }

  componentDidMount() {
    const container = document.getElementById('cy');
    this.cy.mount(container);
    this.cy.resize();

    // function randomArg(...args) {
    //   return args[Math.floor(Math.random() * args.length)];
    // }
    // this.eh = this.controller.eh = this.cy.edgehandles({
    //   snap: true,
    //   edgeParams: () => ({
    //     // TODO temporary data
    //     data: {
    //       attr1: Math.random(), // betwen 0 and 1
    //       attr2: Math.random() * 2.0 - 1.0, // between -1 and 1
    //       attr3: randomArg("A", "B", "C")
    //     }
    //   })
    // });

    this.updateSelectionClass = _.debounce(() => {
      const allEles = this.cy.elements();
      const selectedEles = allEles.filter(':selected');
      const unselectedEles = allEles.subtract(selectedEles);

      this.cy.batch(() => {
        if (allEles.length === unselectedEles.length) {
          allEles.removeClass('unselected');
        } else {
          selectedEles.removeClass('unselected');
          unselectedEles.addClass('unselected');
        }
      });
    }, 64);

    this.cyEmitter.on('tap', event => { // tap on bg
      if (event.target !== this.cy) { return; }
      this.controller.disableDrawMode();
    }).on('select', () => {
      this.updateSelectionClass();
    }).on('unselect', () => {
      this.updateSelectionClass();
    }).on('remove', () => {
      this.updateSelectionClass();
    }).on('ehstop', () => {
      this.controller.disableDrawMode();
    });
  }

  componentWillUnmount() {
    this.cyEmitter.removeAllListeners();
  }

  render() {
    const { controller } = this;
    const { classes, showControlPanel, drawerVariant, onContentClick, onContentKeyDown } = this.props;
    
    const LeftDrawer = () => {
      return (
        <Drawer
          className={classes.drawer}
          variant={drawerVariant}
          anchor="left"
          open={showControlPanel}
          classes={{
            paper: classes.drawerPaper,
          }}
        >
          <div className={classes.drawerHeader}>
            <SearchField controller={controller} />
          </div>
          <Divider />
          <List>
            <GeneListPanel controller={controller} />
          </List>
        </Drawer>
      );
    };

    const shiftCy = showControlPanel && drawerVariant === 'persistent';

    return (
      <div
        className="network-editor-content"
        onClick={onContentClick}
      >
        <LeftDrawer />
        <div className={classes.cy}>
          <div className={clsx(classes.cy, { [classes.cyShift]: shiftCy })}>
            <div id="cy" className={classes.cy} />
            <NetworkBackground controller={controller} />
          </div>
        </div>
      </div>
    );
  }
}

class NetworkBackground extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bgColor: 'white',
    };
    this.busProxy = new EventEmitterProxy(this.props.controller.bus);
  }

  componentDidMount() {
    this.busProxy.on('setNetworkBackgroundColor', (color) => this.setState({ bgColor: color }));
  }

  componentWillUnmount() {
    this.busProxy.removeAllListeners();
  }

  render() {
    const { bgColor } = this.state;

    return (
      <div id="cy-background" style={{ backgroundColor: bgColor }} />
    );
  }
}

const useStyles = theme => ({
  root: {
    padding: '2px 4px',
    display: 'flex',
    alignItems: 'center',
    width: 400,
  },
  input: {
    marginLeft: theme.spacing(1),
    flex: 1,
  },
  iconButton: {
    padding: 10,
  },
  drawer: {
    width: CONTROL_PANEL_WIDTH,
    flexShrink: 0,
  },
  drawerPaper: {
    width: CONTROL_PANEL_WIDTH,
  },
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
});

NetworkBackground.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
};
Main.propTypes = {
  classes: PropTypes.object.isRequired,
  controller: PropTypes.instanceOf(NetworkEditorController),
  showControlPanel: PropTypes.bool.isRequired,
  drawerVariant: PropTypes.string.isRequired,
  onContentClick: PropTypes.func.isRequired,
};

export default withStyles(useStyles)(Main);