import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { QueryClient, QueryClientProvider } from "react-query";

import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape';

import { NODE_ENV } from '../../env';
import { DEFAULT_PADDING } from './defaults';
import { NetworkEditorController } from './controller';
import theme from '../../theme';
import Header from './header';
import Main from './main';

import DEFAULT_NETWORK_STYLE from './network-style';

import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';

const CY_EVENTS = 'data add remove move layoutstop viewport';

const queryClient = new QueryClient();

export class NetworkEditor extends Component {

  constructor(props) {
    super(props);
    const { id, secret, full } = props;

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
    this.controller = new NetworkEditorController(this.cy, this.cySyncher, this.bus);

    if (NODE_ENV !== 'production') {
      window.cy = this.cy;
      window.cySyncher = this.cySyncher;
      window.controller = this.controller;
    }

    this.onCyEvents = this.onCyEvents.bind(this);

    const loadNetwork = async () => {
      console.log('Loading...');

      const res = await fetch(`/api/${id}` + (full ? '?full=true' : ''));
      if(!res.ok) {
        location.href = '/';
        return;
      }

      const result = await res.json();

      if(full) { 
        // Shows entire network, no filtering, no collapsing of clusters
        this.addClusterNodesToNetworkJSON(result);
        this.cy.add(result.network.elements);
      } else {
        // Shows the "summary" network with clusters collapsed, and limited to a max number of nodes
        this.setClusterNodeNamesForSummaryNetwork(result);
        this.limitNodesByQValue(result.summaryNetwork.elements, 50);
        this.cy.add(result.summaryNetwork.elements);
      }

      this.cy.data({ name: result.networkName, parameters: result.parameters });

      this.setLogMappedQValues();

      // Set network style
      const { min:minNES, max:maxNES } = this.getMinMaxValues('NES');

      this.cy.style().fromJson(DEFAULT_NETWORK_STYLE({minNES, maxNES}));

      // Notify listeners that the network has been loaded
      console.log('Loaded');
      this.cy.data({ loaded: true });
      this.controller.bus.emit('networkLoaded', true);

      await this.controller.applyLayout();

      // Lays out the nodes in a grid sorted by q-value
      // this.cy.nodes()
      //   .sort((a,b) => a.data('padj') - b.data('padj'))
      //   .layout({ name: 'grid' })
      //   .run();

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

  setClusterNodeNamesForSummaryNetwork(result) {
    const { summaryNetwork } = result;
    const clusterLabelMap = this.getClusterLabels(result);

    summaryNetwork.elements.nodes.forEach(node => {
      const clusterID = node.data['mcode_cluster_id'];
      if(clusterID) {
        const name = clusterLabelMap.get(clusterID);
        node.data['label'] = name;
        node.data['summary'] = true;
      }
    });
  }

  limitNodesByQValue(elements, max) {
    // Take top nodes sorted by q-value
    elements.nodes.sort((a,b) => a.data.padj - b.data.padj);
    elements.nodes = elements.nodes.slice(0, max);

    const nodeIDs = new Set(elements.nodes.map(n => n.data.id));
    elements.edges = elements.edges.filter(e => nodeIDs.has(e.data.source) && nodeIDs.has(e.data.target));
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
      const label = clusterLabelMap.get(clusterID);
      network.elements.nodes.push({ data: { id: clusterID, label } });
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

  setLogMappedQValues() {
    const nodes = this.cy.nodes();
    const qMax = this.getMaxQValue();
    const log2 = x => Math.log2(x);
    const scale = q => 1 + q * 127; // [0, 1] => [1, 128]

    this.cy.batch(() => {
      for (const node of nodes) {
        const q = node.data('padj');
        const qLog = log2(scale(q)) / log2(scale(qMax));

        node.data('padjLog', qLog);
      }
    });
  }

  getMinMaxValues(attr) {
    return {
      min: this.cy.nodes().min(n => n.data(attr)).value,
      max: this.cy.nodes().max(n => n.data(attr)).value
    };
  }

  getClusterLabels(result) {
    if(!result.clusterLabels)
      return new Map();
    
    let labels;
    if(Array.isArray(result.clusterLabels))
      labels = result.clusterLabels[result.clusterLabels.length - 1].labels;
    else
      labels = result.clusterLabels.labels;
      
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

    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div className="network-editor">
            <Header
              controller={controller}
              showControlPanel={showControlPanel}
              isMobile={isMobile}
              onShowControlPanel={this.onShowControlPanel}
            />
            <Main
              controller={controller}
              showControlPanel={showControlPanel}
              isMobile={isMobile}
              onContentClick={onContentClick}
            />
          </div>
        </ThemeProvider>
      </QueryClientProvider>
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
  id: PropTypes.string,
  secret: PropTypes.string,
  full: PropTypes.bool
};

export default NetworkEditor;