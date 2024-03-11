import _ from 'lodash';
import chroma from 'chroma-js';
import { parsePathwayName } from './search-contoller';

export const NODE_OPACITY = 1;
export const TEXT_OPACITY = 1;
export const SELECTED_BORDER_COLOR = '#333333';

/** Color range for up-down regulation. */
export const REG_COLOR_RANGE = (() => {
  // ColorBrewer 2.0 -- Diverging (Colorblind Safe)
  // IMPORTANT: Use only hex format, do NOT use 'rgb()'!
  const colors = ['#0571b0', '#92c5de', '#f7f7f7', '#f4a582', '#ca0020']; // 5-class RdBu: https://colorbrewer2.org/#type=diverging&scheme=RdBu&n=5
  // const colors = ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c']; // 5-class RdYlBu: https://colorbrewer2.org/#type=diverging&scheme=RdYlBu&n=5
  // const colors = ['#5e3c99', '#b2abd2', '#f7f7f7', '#fdb863', '#e66101']; // 5-class PuOr: https://colorbrewer2.org/#type=diverging&scheme=PuOr&n=5
  // const colors = ['#008837', '#a6dba0', '#f7f7f7', '#c2a5cf', '#7b3294']; // 5-class PRGn: // https://colorbrewer2.org/#type=diverging&scheme=PRGn&n=5
  // const colors = ['#4dac26', '#b8e186', '#f7f7f7', '#f1b6da', '#d01c8b']; // 5-class PiYG: https://colorbrewer2.org/#type=diverging&scheme=PiYG&n=5
  // const colors = ['#018571', '#80cdc1', '#f5f5f5', '#dfc27d', '#a6611a']; // 5-class BrBG: https://colorbrewer2.org/#type=diverging&scheme=BrBG&n=5
  const downMax = colors[0];
  const down = colors[1];
  const zero = colors[2];
  const up = colors[3];
  const upMax = colors[4];
  const range3 = [ downMax, zero, upMax ];
  const range5 = colors;
  return { downMax, down, zero, up, upMax, range3, range5 };
})();
  
export const clusterColor = (node) => {
  const nes = node.data('NES'); 
  // For now, just use the downMax or upMax colors
  // -- do we want to use an interpolated color from the gradient instead?
  // -- TODO: what if NES is zero?
  const hex = nes < 0 ? REG_COLOR_RANGE.downMax : REG_COLOR_RANGE.upMax;
  return hexToRgb(hex);
};

function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getMinMaxValues(cy, attr) {
  return {
    min: cy.nodes().min(n => n.data(attr)).value,
    max: cy.nodes().max(n => n.data(attr)).value
  };
}


export const nodeLabel = _.memoize(node => {
  const label = node.data('label');
  if(label)
    return label.toUpperCase();
  const name = node.data('name');
  const pathway = Array.isArray(name) ? name[0] : name;
  return parsePathwayName(pathway);
}, node => node.id());


export const createNetworkStyle = (cy) => {
  const { min:minNES, max:maxNES } = getMinMaxValues(cy, 'NES');
  const magNES = Math.max(Math.abs(maxNES), Math.abs(minNES));

  const nesColorScale = chroma.scale(REG_COLOR_RANGE.range3).domain([-magNES, 0, magNES]);

  const getNodeColor = _.memoize(node => {
    return nesColorScale(node.data('NES')).toString();
  }, node => node.id());

  const clusterTextColor = _.memoize(parentNode => {
    const c = clusterColor(parentNode);
    return `rgb(${c.r}, ${c.g}, ${c.b})`;
  }, parentNode => parentNode.id());

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
          'font-size': '10px',
          'text-valign': 'top',
          'text-wrap': 'wrap',
          'text-max-width': 120,
          'text-outline-width': 4,
          'text-outline-opacity': 1,
          'text-outline-color': '#fff',
          'color': '#000',
          'z-index': 2,
          'label': nodeLabel,
          'font-weight': 'bold',
          'line-height': 1.2,
          'text-events': 'yes',
          'text-margin-y': -2
        }
      },
      {
        selector: ':parent',
        style: {
          'background-opacity': 0.0,
          'border-width': 0,
          'font-size': '14px',
          'text-valign':'top',
          'text-outline-width': 4,
          'text-outline-opacity': 1,
          'text-outline-color': '#fff',
          'text-opacity': 1,
          'color': '#000',
          'text-events': 'yes',
        }
      },
      {
        selector: 'node:active',
        style: {
          'overlay-opacity': 0.25
        }
      },
      {
        selector: 'node[NES]:childless',
        style: {
          'background-color':   getNodeColor
        }
      },
      {
        selector: 'node[parent][?collapsed]',
        style: {
          'label': ''
        }
      },
      {
        selector: 'node[parent][?collapsed]',
        style: {
          'label': '',
          'overlay-opacity': 0
        }
      },
      {
        selector: 'node.grabbing-collapsed-child',
        style: {
          'overlay-opacity': 0.25
        }
      },
      {
        selector: 'node.box-select-enabled',
        style: {
          'events': 'yes'
        }
      },
      {
        selector: 'edge',
        style: {
          'line-color' : '#888',
          'line-opacity': 0.3,
          'curve-style': 'haystack',
          'haystack-radius': 0,
          'width': ele => ele.data('similarity_coefficient') * 15,
          'z-index': 1,
          'z-compound-depth': 'bottom',
          'z-index-compare': 'manual'
        }
      },
      {
        selector: 'edge[!collapsed]',
        style: {
          'z-index': 1,
          'z-compound-depth': 'auto',
          'z-index-compare': 'auto'
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': 8,
          'border-color': SELECTED_BORDER_COLOR,
          'border-opacity': 1.0,
          'text-outline-color': SELECTED_BORDER_COLOR,
          'z-index': 99999999,
        }
      },
      {
        selector: 'node:parent:selected',
        style: {
          'border-width': 0,
          'text-outline-color': '#fff',
        }
      },
      {
        selector: 'edge:selected',
        style: {
          'line-color': '#333333',
          'line-opacity': 1.0,
          'z-index': 9999999,
        }
      },
      {
        selector: 'node.unhighlighted',
        style: {
          'opacity': 0.1,
          'label': '',
          'z-index': 1,
        }
      },
      {
        selector: 'node.unhighlighted:parent',
        style: {
          'label': ''
        }
      },
      {
        selector: 'edge.unhighlighted',
        style: {
          'line-opacity': 0.0,
          'z-index': 1,
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