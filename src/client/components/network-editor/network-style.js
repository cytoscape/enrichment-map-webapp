import _ from 'lodash';
import chroma from 'chroma-js';


export const MAX_NODE_WIDTH = 600;

export const NES_COLOR_RANGE = (() => {
  const colors = ['#7b3294', '#c2a5cf', '#f7f7f7', '#a6dba0', '#008837']; // PRGn
  const downMax = colors[0];
  const down = colors[1];
  const zero = colors[2];
  const up = colors[3];
  const upMax = colors[4];
  const range3 = [ downMax, zero, upMax ];
  const range5 = colors;
  return { downMax, down, zero, up, upMax, range3, range5 };
})();


function getMinMaxValues(cy, attr) {
  return {
    min: cy.nodes().min(n => n.data(attr)).value,
    max: cy.nodes().max(n => n.data(attr)).value
  };
}

export const nodeLabel = _.memoize(node => {
  const label = (() => {
    const label = node.data('label');
    if(label)
      return label;
    const name = node.data('name');
    return Array.isArray(name) ? name[0] : name;
  })();
  const text = label.replace(/_/g, ' ');
  const percent = text.indexOf('%');
  return (percent > 0 ? text.substring(0, percent) : text).toLowerCase();
}, node => node.id());

export const createNetworkStyle = (cy) => {
  const { min: minNES, max: maxNES } = getMinMaxValues(cy, 'NES');
  const magNES = Math.max(Math.abs(maxNES), Math.abs(minNES));
  const nesColorScale = chroma.scale(NES_COLOR_RANGE.range3).domain([-magNES, 0, magNES]);
  
  const getBGColor = _.memoize(node => {
    return nesColorScale(node.data('NES')).toString();
  }, node => node.id());

  const getNodeWidth = _.memoize(node => {
    const n = Math.abs(node.data('NES'));
    const n1 = 0;
    const n2 = Math.max(Math.abs(maxNES), Math.abs(minNES));
    const w1 = 0;
    const w2 = MAX_NODE_WIDTH;
    return ((n - 0) / (n2 - n1)) * (w2 - w1) + w1;
  }, node => node.id());
  
  const getTextMarginX = _.memoize(node => {
    let margin = node.width();
    if (node.data('NES') >= 0) margin *= -1;
    return margin;
  }, node => node.id());
  
  const sortedNodes = cy.nodes().sort((a, b) => b.data('NES') - a.data('NES'));

  const getControlPointDistances = _.memoize(edge => {
    const idx1 = sortedNodes.indexOf(edge.source());
    const idx2 = sortedNodes.indexOf(edge.target());
    const diff = Math.abs(idx2 - idx1); // absolute indexes delta
    let inv = (idx2 - idx1) / diff; // invert ctrl point if the target node is before the source node
    if (edge.source().data('NES') < 0 || edge.target  ().data('NES') < 0) inv *= -1; // invert again if at least one of the nodes is on the left of the chart (negative NES)
    let d = inv * 1.8 * Math.sqrt(diff) * MAX_NODE_WIDTH / 8;
    if (d >= 0 ) {
      d = Math.min(d, MAX_NODE_WIDTH);
      d = Math.max(d, MAX_NODE_WIDTH / 2.2);
    } else {
      d = Math.max(d, -MAX_NODE_WIDTH);
      d = Math.min(d, MAX_NODE_WIDTH / -2.2);
    }
    return d;
  }, edge => edge.id());

  return {
    maxNES,
    minNES,
    magNES,
    getBGColor,
    cyJSON: [
      {
        selector: 'node',
        style: {
          'shape': 'rectangle',
          'background-color': getBGColor,
          'opacity': 1,
          'border-width': 12,
          'border-opacity': 0,
          'label': nodeLabel,
          'width': getNodeWidth,
          'height': 20,
          'font-size': '12px',
          'text-valign': 'top',
          'text-halign': ele => ele.data('NES') < 0 ? 'left' : 'right',
          'text-margin-x': getTextMarginX,
          'text-margin-y': -2,
          'text-wrap': 'none',
          'text-max-width': MAX_NODE_WIDTH,
          'color': '#666',
        }
      },
      {
        selector: 'edge',
        style: {
          'line-color' : '#aaa',
          'line-opacity': 0.6,
          'curve-style': 'unbundled-bezier',
          'control-point-distances': getControlPointDistances,
          'control-point-weights': 0.5,
          'source-endpoint': ele => ele.source().data('NES') >= 0 ? '270deg' : '90deg',
          'target-endpoint': ele => ele.target().data('NES') >= 0 ? '270deg' : '90deg',
          'width': ele => ele.data('similarity_coefficient') * 10,
        }
      },
      {
        selector: 'edge[interaction = "Geneset_Overlap"]',
        style: {
          'line-color' : 'red',
        }
      },
      {
        selector: ':parent',
        style: {
          'background-opacity': 0.2,
          'border-color': '#2B65EC',
          'font-size': '24px',
          'text-valign':'top',
          'text-outline-width': 0,
          'text-outline-opacity': 0,
          'color': '#000'
        }
      },
      {
        selector: 'node.unselected',
        style: {
          
        }
      },
      {
        selector: 'edge.unselected',
        style: {
          
        }
      },
      {
        selector: 'node.selected',
        style: {
          'border-width': 8,
          'border-color': '#5aaae0',
          'border-opacity': 0.8
        }
      },
      {
        selector: 'edge.selected',
        style: {
          'line-color': '#5aaae0'
        }
      }
    ]
  };
};

export default createNetworkStyle;