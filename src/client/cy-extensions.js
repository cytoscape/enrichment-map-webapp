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

  // Collection extensions
  Cytoscape.use(internalEdges);
  Cytoscape.use(shuffle);
  Cytoscape.use(centroid);
};



function internalEdges(cy) {
  const internalEdgesImpl = function(node) {
    const eles = this;
    const cluster = eles.nodes();
    const nodes = node ? node : cluster;
    return nodes.connectedEdges().filter(e => cluster.contains(e.source()) && cluster.contains(e.target()));
  };
  cy('collection', 'internalEdges', internalEdgesImpl);
}


function shuffle(cy) {
  const shuffleArray = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  };
  const shuffleImpl = function() {
    const eles = this;
    const arr = eles.toArray();
    shuffleArray(arr);
    return eles.cy().collection(arr);
  };
  cy('collection', 'shuffle', shuffleImpl);
}


function centroid(cy) {
  const centroidImpl = function() {
    const eles = this;
    let xs = 0, ys = 0, total = 0;
    eles.nodes().forEach(node => {
      const pos = node.position();
      xs += pos.x;
      ys += pos.y;
      total++;
    });
    return {
      x: xs/total, 
      y: ys/total 
    };
  };
  cy('collection', 'centroid', centroidImpl);
}