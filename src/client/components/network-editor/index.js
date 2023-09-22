import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import Cytoscape from 'cytoscape';
import { QueryClient, QueryClientProvider } from "react-query";

import { NetworkEditorController } from './controller';
import theme from '../../theme';
import Header from './header';
import Main from './main';

import createNetworkStyle from './network-style';

import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import LegendActionButton from './legend-button';


const queryClient = new QueryClient();


function createCy(id) {
  console.log(`createCy(${id})`);

  const cy = new Cytoscape({
    headless: true,
    styleEnabled: true,
    boxSelectionEnabled: false,
    selectionType: 'single',
  });
  cy.data({ id });
  return cy;
}


async function loadNetwork(cy, controller, id) {
  console.log('Loading...');

  const res = await fetch(`/api/${id}`);
  if(!res.ok) {
    location.href = '/';
    return;
  }

  const networkJson = await res.json();
  // setClusterNodeNamesForSummaryNetwork(networkJson);

  // cy.add(networkJson.summaryNetwork.elements);
  cy.add(networkJson.network.elements);
  cy.data({ 
    name: networkJson.networkName, 
    parameters: networkJson.parameters
  });

  await controller.applyLayout();
  await controller.createClusters(networkJson.clusterLabels[0].labels, 'mcode_cluster_id');

  // Set network style
  const style = createNetworkStyle(cy);
  cy.style().fromJson(style.cyJSON);
  controller.style = style; // Make available to components

  // Notify listeners that the network has been loaded
  console.log('Loaded');
  cy.data({ loaded: true });
  controller.bus.emit('networkLoaded', true); 

  console.log('Successful load from DB');
  console.log('End of editor sync initial phase');

  // make the controller accessible from the chrome console for debugging purposes
  window.controller = controller;
}


function setClusterNodeNamesForSummaryNetwork(result) {
  function createClusterLabelMap() {
    if(!result.clusterLabels)
      return new Map();
    
    let labels;
    if(Array.isArray(result.clusterLabels))
      labels = result.clusterLabels[result.clusterLabels.length - 1].labels;
    else
      labels = result.clusterLabels.labels;
      
    return new Map(labels.map(obj => [obj.clusterId, obj.label]));
  }

  const { summaryNetwork } = result;
  const clusterLabelMap = createClusterLabelMap();

  summaryNetwork.elements.nodes.forEach(node => {
    const clusterID = node.data['mcode_cluster_id'];
    if(clusterID) {
      const name = clusterLabelMap.get(clusterID);
      node.data['label'] = name;
      node.data['summary'] = true;
    }
  });
}


function isMobile() {
  const sm = theme.breakpoints.values.sm;
  return window.innerWidth < sm;
}


export function NetworkEditor({ id }) {
  const [ cy ] = useState(() => createCy(id));
  const [ controller ] = useState(() => new NetworkEditorController(cy));

  const [ mobile, setMobile ] = useState(() => isMobile());
  const [ showControlPanel, setShowControlPanel ] = useState(() => !isMobile());

  useEffect(() => {
    loadNetwork(cy, controller, id);
    return () => cy.destroy();
  }, []);

  useEffect(() => {
    const handleResize = () => setMobile(isMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape')
        maybeHideDrawer();
    };
    document.addEventListener('keydown', onKeyDown, false);
    return () => document.removeEventListener('keydown', onKeyDown, false);
  }, []);

  useEffect(() => {
    const onSelect = () => setShowControlPanel(!isMobile());
    cy.on('select', onSelect);
    return () => cy.removeListener('select', onSelect);
  }, []);

  const maybeHideDrawer = () => {
    if (mobile) {
      setShowControlPanel(false);
    }
  };

  const onContentClick = event => {
    if (showControlPanel && mobile && event.target.className === 'MuiBackdrop-root') {
      maybeHideDrawer();
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LegendActionButton controller={controller} />
        <div className="network-editor">
          <Header
            controller={controller}
            showControlPanel={showControlPanel}
            isMobile={mobile}
            onShowControlPanel={setShowControlPanel}
          />
          <Main
            controller={controller}
            showControlPanel={showControlPanel}
            isMobile={mobile}
            onContentClick={onContentClick}
          />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}


export function Demo() {
  return <NetworkEditor id="demo" secret="demo" />;
}

NetworkEditor.propTypes = {
  id: PropTypes.string,
};

export default NetworkEditor;