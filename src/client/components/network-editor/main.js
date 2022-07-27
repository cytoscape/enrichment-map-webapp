import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import SearchField from './search-field';
import { GeneListPanel } from './gene-list-panel';

import { withStyles } from '@material-ui/core/styles';

import { Drawer, Divider, List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';

import InboxIcon from '@material-ui/icons/MoveToInbox';
import MailIcon from '@material-ui/icons/Mail';

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
    const { classes, showControlPanel } = this.props;

    return (
      <div className="network-editor-content">
        <Drawer
          className={classes.drawer}
          variant="persistent"
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
        <div className="cy">
          <div id="cy" />
          <NetworkBackground controller={controller} />
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

const drawerWidth = 240;

const useStyles = theme => ({
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
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
});

NetworkBackground.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
};
Main.propTypes = {
  classes: PropTypes.object.isRequired,
  controller: PropTypes.instanceOf(NetworkEditorController),
  showControlPanel: PropTypes.bool.isRequired,
};

export default withStyles(useStyles)(Main);