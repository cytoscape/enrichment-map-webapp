import _ from 'lodash';
import chroma from 'chroma-js';


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
  const text = (node.data('label') ?? node.data('name')).replace(/_/g, ' ');
  const percent = text.indexOf('%');
  
  return (percent > 0 ? text.substring(0, percent) : text).toLowerCase();
}, node => node.id());


export const createNetworkStyle = (cy) => {
  const { min:minNES, max:maxNES } = getMinMaxValues(cy, 'NES');
  const magNES = Math.max(Math.abs(maxNES), Math.abs(minNES));
  const nesColorScale = chroma.scale(NES_COLOR_RANGE.range3).domain([-magNES, 0, magNES]);
  
  const getBGColor = _.memoize(node => {
    return nesColorScale(node.data('NES')).toString();
  }, node => node.id());

  return {
    maxNES,
    minNES,
    magNES,
    getBGColor,
    cyJSON: [
      {
        selector: 'node',
        style: {
          'opacity': 1,
          'border-width': 12,
          'border-opacity': 0,
          'label': nodeLabel,
          'width':  40,
          'height': 40,
          'font-size': '8px',
          'text-valign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': 80,
          'text-outline-width': 2,
          'text-outline-opacity': 1,
          'color': '#fff'
        }
      },
      {
        selector: 'node[NES]',
        style: {
          'background-color':   getBGColor,
          'text-outline-color': getBGColor,
        }
      },
      {
        selector: 'edge',
        style: {
          'line-color' : '#888',
          'line-opacity': 0.6,
          'curve-style': 'haystack',
          'haystack-radius': 0,
          'width': ele => ele.data('similarity_coefficient') * 30,
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
          'border-width': 12,
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