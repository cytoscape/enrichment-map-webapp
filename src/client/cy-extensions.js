import Cytoscape from 'cytoscape';
import edgehandles from 'cytoscape-edgehandles';
import dagre from 'cytoscape-dagre';
import fcose from 'cytoscape-fcose';
import cola from 'cytoscape-cola';
import popper from 'cytoscape-popper';
import coseBilkent from 'cytoscape-cose-bilkent';
import BubbleSets from 'cytoscape-bubblesets';

export const registerCytoscapeExtensions = () => {
  Cytoscape.use(edgehandles);

  // Layout extensions
  Cytoscape.use(dagre);
  Cytoscape.use(fcose);
  Cytoscape.use(cola);
  Cytoscape.use(coseBilkent);

  Cytoscape.use(BubbleSets);

  Cytoscape.use(popper);
};
