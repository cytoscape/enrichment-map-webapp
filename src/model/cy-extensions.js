import Cytoscape from 'cytoscape';
import edgehandles from 'cytoscape-edgehandles';
import dagre from 'cytoscape-dagre';
import fcose from 'cytoscape-fcose';
import cola from 'cytoscape-cola';
import popper from 'cytoscape-popper';

export const registerCytoscapeExtensions = () => {
  Cytoscape.use(edgehandles);

  // Layout extensions
  Cytoscape.use(dagre);
  Cytoscape.use(fcose);
  Cytoscape.use(cola);

  Cytoscape.use(popper);
};
