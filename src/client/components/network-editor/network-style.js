import _ from 'lodash';
import chroma from 'chroma-js';

export const NODE_OPACITY = 1;
export const TEXT_OPACITY = 1;

/** Color range for up-down regulation. */
export const REG_COLOR_RANGE = (() => {
  // PRGn -- https://colorbrewer2.org/#type=diverging&scheme=RdBu&n=5
  const colors = ['#7b3294', '#c2a5cf', '#f7f7f7', '#a6dba0', '#008837'];
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

// function truncateString(str, num) {
//   if (str.length > num) {
//     return str.slice(0, num) + "...";
//   } else {
//     return str;
//   }
// }

// export const nodeLabel = _.memoize(node => {
//   const label = (() => {
//     const label = node.data('label');
//     if(label)
//       return label;
//     const name = node.data('name');
//     return Array.isArray(name) ? name[0] : name;
//   })();
//   const text = label.replace(/_/g, ' ');
//   const percent = text.indexOf('%');
//   const sublabel = (percent > 0 ? text.substring(0, percent) : text).toLowerCase();
//   return truncateString(sublabel, 35);
// }, node => node.id());

export const createNetworkStyle = (cy) => {
  const { min:minNES, max:maxNES } = getMinMaxValues(cy, 'NES');
  const magNES = Math.max(Math.abs(maxNES), Math.abs(minNES));

  const nesColorScale = chroma.scale(REG_COLOR_RANGE.range3).domain([-magNES, 0, magNES]);

  const getNodeColor = _.memoize(node => {
    return nesColorScale(node.data('NES')).toString();
  }, node => node.id());

  return {
    maxNES,
    minNES,
    magNES,
    getNodeColor,
    cyJSON: [
      {
        selector: 'node',
        style: {
          'opacity': NODE_OPACITY,
          'border-width': 12,
          'border-opacity': 0,
          'width':  40,
          'height': 40,
          'font-size': '8px',
          'text-valign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': 80,
          'text-outline-width': 2,
          'text-outline-opacity': TEXT_OPACITY,
          'color': '#fff',
        }
      },
      {
        selector: ':parent',
        style: {
          'background-opacity': 0.0,
          'border-width': 0,
          'font-size': '14px',
          'text-valign':'top',
          'text-outline-width': 0,
          'text-outline-opacity': 0,
          'color': '#6190bf', // just a lighter tint of the logo's blue color (#1F78B4)
        }
      },
      {
        selector: 'node[?label]',
        style: {
          'label': 'data(label)',
        }
      },
      {
        selector: 'node[NES]',
        style: {
          'background-color':   getNodeColor,
          'text-outline-color': getNodeColor,
        }
      },
      {
        selector: 'node[parent][collapsed="true"]',
        style: {
          'label': n => '',
        }
      },
      {
        selector: 'edge',
        style: {
          'line-color' : '#888',
          'line-opacity': 0.3,
          'curve-style': 'haystack',
          'haystack-radius': 0,
          // 'width': ele => ele.data('similarity_coefficient') * 30,
          'width': ele => ele.data('similarity_coefficient') * 15,
        }
      },
      {
        selector: 'edge[interaction = "Geneset_Overlap"]',
        style: {
          'line-color' : 'red',
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
      },
      {
        selector: 'node.unhighlighted',
        style: {
          'opacity': 0.05,
        }
      },

      {
        selector: 'edge.unhighlighted',
        style: {
          'opacity': 0.0,
        }
      },
      {
        selector: '.highlighted',
        style: {
          'z-index': 999999,
        }
      },
    ]
  };
};

export default createNetworkStyle;