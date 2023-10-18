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
import _ from 'lodash';

const queryClient = new QueryClient();


function createCy(id) {
  console.log(`createCy(${id})`);

  const cy = new Cytoscape({
    headless: true,
    styleEnabled: true,
    boxSelectionEnabled: true,
    selectionType: 'single',
  });
  cy.data({ id });
  return cy;
}


async function loadNetwork(cy, controller, id) {
  console.log('Loading...');

  const networkPromise = fetch(`/api/${id}`);
  const positionsPromise = fetch(`/api/${id}/positions`);

  const networkResult = await networkPromise;
  if(!networkResult.ok) {
    location.href = '/';
    return;
  }
  const networkJson = await networkResult.json();

  cy.add(networkJson.network.elements);
  cy.data({ 
    name: networkJson.networkName, 
    parameters: networkJson.parameters
  });

  // await controller.applyLayout();

  let positionsMap;
  const positionsResult = await positionsPromise;
  if(positionsResult.status == 404) {
    console.log('running layout');
    await controller.applyLayout();
  } else {
    console.log('got positions from mongo');
    const positionsJson = await positionsResult.json();
    positionsMap = controller.applyPositions(positionsJson.positions);
  }

  const clusterDefs = networkJson.clusterLabels[0].labels;
  await controller.createClusters(clusterDefs, 'mcode_cluster_id', positionsMap);

  // Set network style
  const style = createNetworkStyle(cy);
  cy.style().fromJson(style.cyJSON);
  controller.style = style; // Make available to components

  cy.on('position remove', 'node', _.debounce(() => {
    controller.savePositions();
  }, 4000));

  cy.on('click', e => {
    if(e.target === cy) {
      const pointFactory = document.getElementById('svg_point_factory');
      controller.detectBubbleSetClick(pointFactory, e.position);
    }
  });

  // Selecting an edge should select its nodes, but the edge itself must never be selected
  // (this makes it easier to keep the Pathways table selection consistent)
  cy.edges().on('select', evt => {
    const edge = evt.target;
    edge.source().select();
    edge.target().select();
    edge.unselect();
  });
  // Prevent compound nodes from being selected as well
  cy.nodes(':parent').on('select', evt => {
    const node = evt.target;
    if (node.isParent()) {
      node.unselect();
    }
  });

  // Notify listeners that the network has been loaded
  console.log('Loaded');
  cy.data({ loaded: true });
  controller.bus.emit('networkLoaded', true); 

  console.log('Successful Network Load');

  // make the controller accessible from the chrome console for debugging purposes
  window.controller = controller;
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
        <div className="network-editor">
          <svg id="svg_point_factory" style={{ position:'absolute', pointerEvents:'none'}}/>
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