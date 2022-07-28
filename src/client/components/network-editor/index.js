import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape';

import { NODE_ENV } from '../../env';
import { DEFAULT_PADDING } from './defaults';
import { NetworkEditorController } from './controller';
import theme from '../../theme';
import Header from './header';
import Main from './main';

import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';

const CY_EVENTS = 'data add remove move layoutstop viewport';

export class NetworkEditor extends Component {

  constructor(props) {
    super(props);

    const id = _.get(props, ['match', 'params', 'id'], _.get(props, 'id'));
    const secret = _.get(props, ['match', 'params', 'secret'], _.get(props, 'secret'));

    // TODO temporary
    this.secret = secret;

    this.bus = new EventEmitter();

    this.cy = new Cytoscape({
      headless: true,
      styleEnabled: true
    });

    this.cy.data({ id });
    this.controller = new NetworkEditorController(this.cy, this.cySyncher, this.bus);

    if (NODE_ENV !== 'production') {
      window.cy = this.cy;
      window.cySyncher = this.cySyncher;
      window.controller = this.controller;
    }

    this.onCyEvents = this.onCyEvents.bind(this);

    this.cy.style().fromJson([
      {
        selector: 'node',
        style: {
          'background-color': 'blue',
          'label': 'data(name)',
          'width':  ele => ele.data('gs_size') / 10,
          'height': ele => ele.data('gs_size') / 10,
          'font-size': '5px',
        }
      },
      {
        selector: 'edge',
        style: { 
          'curve-style': 'bezier',
          'width': ele => ele.data('similarity_coefficient') * 10
        }
      },
      {
        selector: 'node',
        style: {
          'text-wrap': 'wrap',
          'text-max-width': 60
        }
      },
      {
        selector: '.unselected',
        style: {
          'opacity': 0.333
        }
      },
      {
        selector: 'node.eh-preview',
        style: {
          'overlay-opacity': 0.25
        }
      },
      {
        selector: '.eh-handle',
        style: {
          'opacity': 0,
          'events': 'no'
        }
      },
      {
        selector: '.eh-ghost-edge.eh-preview-active',
        style: {
          'opacity': 0
        }
      }
    ]);

    const enableSync = async () => {
      console.log('Starting to enable sync in editor');

      console.log('Loading');

      const res = await fetch(`/api/${id}`);
      const result = await res.json();

      this.cy.add(result.network.elements);
      this.cy.data({ parameters: result.parameters });

      console.log('Loaded');

      this.cy.fit(DEFAULT_PADDING);
      this.cy.layout({ 
        name: 'cose',
        animate: false, 
      }).run();

      console.log('Successful load from DB');
      console.log('End of editor sync initial phase');
    };

    enableSync();

    this.state = {
      showControlPanel: false,
    };

    this.onShowControlPanel = this.onShowControlPanel.bind(this);
  }

  onCyEvents() {
    const secret = this.secret;
    // TODO auto-save
  }

  componentDidMount() {
    const secret = this.secret;
    this._debounceCyEvents = _.debounce(this.onCyEvents, 500);
    this.cy.on(CY_EVENTS, this._debounceCyEvents);
  }

  componentWillUnmount() {
    this.cy.removeListener(CY_EVENTS, this._debounceCyEvents);
    this.eh.destroy();
    this.bus.removeAllListeners();
    this.cy.destroy();
  }

  onShowControlPanel(show) {
    this.setState({ showControlPanel: show });
  }

  render() {
    const { controller } = this;
    const { showControlPanel } = this.state;

    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="network-editor">
          <Header
            controller={controller}
            onShowControlPanel={this.onShowControlPanel}
            showControlPanel={showControlPanel}
          />
          <Main
            controller={controller}
            showControlPanel={showControlPanel}
          />
        </div>
      </ThemeProvider>
    );
  }
}

export class Demo extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <NetworkEditor id="demo" secret="demo" />;
  }
}

NetworkEditor.propTypes = {
};

export default NetworkEditor;