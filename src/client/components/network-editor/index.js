import _ from 'lodash';
import React, { Component } from 'react';
import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape';

import { NODE_ENV } from '../../env';
import { DEFAULT_PADDING } from './defaults';
import { NetworkEditorController } from './controller';
import theme from '../../theme';
import Header from './header';
import Main from './main';
import StyleLegend from './legend';

import DEFAULT_NETWORK_STYLE from './network-style';

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
      styleEnabled: true,
      boxSelectionEnabled: false,
      selectionType: 'single',
    });

    this.cy.data({ id });
    this.controller = new NetworkEditorController(this.cy, this.bus);

    if (NODE_ENV !== 'production') {
      window.cy = this.cy;
      window.controller = this.controller;
    }

    this.onCyEvents = this.onCyEvents.bind(this);

    const loadNetwork = async () => {
      console.log('Starting to enable sync in editor');
      console.log('Loading...');

      const res = await fetch(`/api/${id}`);
      const result = await res.json();
      this.addClusterNodesToNetworkJSON(result);

      this.cy.add(result.network.elements);
      this.cy.data({ parameters: result.parameters });

      const minQVal = this.getMinQValue();
      const maxQVal = this.getMaxQValue();
      this.cy.data({ minQVal, maxQVal });
      console.log("Max q-value: " + maxQVal);

      // Set network style
      this.cy.style().fromJson(DEFAULT_NETWORK_STYLE(minQVal, maxQVal));

      // Notify listeners that the network has been loaded
      console.log('Loaded');
      this.cy.data({ loaded: true });
      this.controller.bus.emit('networkLoaded');

      // this.cy.fit(DEFAULT_PADDING);
      // this.cy.layout({ 
      //   name: 'fcose',
      //   idealEdgeLength: 100,
      //   nodeSeparation: 150,
      //   animate: false,
      // }).run();

      this.controller.applyLayout();

      console.log('Successful load from DB');
      console.log('End of editor sync initial phase');
    };

    loadNetwork();

    const isMobile = this.isMobile();

    this.state = {
      showControlPanel: !isMobile,
      isMobile,
    };

    this.handleResize = this.handleResize.bind(this);
    this.onShowControlPanel = this.onShowControlPanel.bind(this);
    this.onContentKeyDown = this.onContentKeyDown.bind(this);

    window.addEventListener("resize", this.handleResize);
  }

  addClusterNodesToNetworkJSON(result) {
    const { network } = result;
    const clusterLabelMap = this.getClusterLabels(result);

    const clusterMap = new Map();

    network.elements.nodes.forEach(node => {
      const clusterID = node.data['mcode_cluster_id'];
      if(clusterID) {
        if(!clusterMap.has(clusterID)) {
          clusterMap.set(clusterID, [node]);
        } else {
          clusterMap.get(clusterID).push(node);
        }
      }
    });

    clusterMap.forEach((nodes, clusterID) => {
      const name = clusterLabelMap.get(clusterID);
      network.elements.nodes.push({ data: { id: clusterID, name } });
      nodes.forEach(node => {
        node.data['parent'] = clusterID;
      });
    });
  }

  getMinQValue() {
    return this.cy.nodes().min(n => n.data('padj')).value;
  }

  getMaxQValue() {
    return this.cy.nodes().max(n => n.data('padj')).value;
  }

  getClusterLabels(result) {
    if(!result.clusterLabels)
      return new Map();
    const { labels } = result.clusterLabels;
    return new Map(labels.map(obj => [obj.clusterId, obj.label]));
  }

  onCyEvents() {
    const secret = this.secret;
    // TODO auto-save
  }

  componentDidMount() {
    const secret = this.secret;
    this._debounceCyEvents = _.debounce(this.onCyEvents, 500);
    this.cy.on(CY_EVENTS, this._debounceCyEvents);
    document.addEventListener("keydown", this.onContentKeyDown, false);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.onContentKeyDown, false);
    this.cy.removeListener(CY_EVENTS, this._debounceCyEvents);
    this.eh.destroy();
    this.bus.removeAllListeners();
    this.cy.destroy();
  }

  handleResize() {
    const isMobile = this.isMobile();
    if (this.state.isMobile !== isMobile) {
      this.setState({ isMobile });
    }
  }

  maybeHideDrawer() {
    if (this.isMobile()) {
      this.setState({ showControlPanel: false });
    }
  }

  isMobile() {
    const sm = theme.breakpoints.values.sm;
    
    return window.innerWidth < sm;
  }

  onShowControlPanel(show) {
    this.setState({ showControlPanel: show });
  }

  onContentKeyDown(event) {
    if (event.key === 'Escape') {
      this.maybeHideDrawer();
    }
  }

  render() {
    const { controller } = this;
    const { showControlPanel, isMobile } = this.state;

    const onContentClick = (event) => {
      if (showControlPanel && isMobile && event.target.className === 'MuiBackdrop-root') {
        this.maybeHideDrawer();
      }
    };

    const drawerVariant = isMobile ? 'temporary' : 'persistent';

    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="network-editor">
          <Header
            controller={controller}
            showControlPanel={showControlPanel}
            drawerVariant={drawerVariant}
            onShowControlPanel={this.onShowControlPanel}
          />
          <Main
            controller={controller}
            showControlPanel={showControlPanel}
            drawerVariant={drawerVariant}
            onContentClick={onContentClick}
          />
          <StyleLegend controller={controller} />
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