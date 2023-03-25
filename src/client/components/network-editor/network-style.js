import _ from 'lodash';
import chroma from 'chroma-js';


const nodeLabel = _.memoize(node => {
  const text = node.data('label') ?? node.data('name');
  const percent = text.indexOf('%');

  if (percent > 0) {
    return text.substring(0, percent).toLowerCase();
  } else {
    return text;
  }
}, node => node.id());


export const NES_COLOR_RANGE = (() => {
  const PRGn = ['#7b3294', '#c2a5cf', '#f7f7f7', '#a6dba0', '#008837']; // PRGn
  const negative = PRGn[0];
  const zero = PRGn[2];
  const positive = PRGn[4]; 
  const range3 = [ negative, zero, positive ];
  const range5 = PRGn;
  return { negative, zero, positive, range3, range5 };
})();


export const DEFAULT_NETWORK_STYLE = (netStats) => {
  const { maxNES, minNES } = netStats;
  const magNES = Math.max(Math.abs(maxNES), Math.abs(minNES));

  const nesColorScale = chroma.scale(NES_COLOR_RANGE.range3).domain([-magNES, 0, magNES]);
  const getBGColor = ele => nesColorScale(ele.data('NES')).toString();

  return [
    {
      selector: 'node',
      style: {
        'opacity': 1,
        'border-width': 0,
        'border-opacity': 0.7,
        'label': nodeLabel,
        'width':  40,
        'height': 40,
        'font-size': '8px',
        'text-valign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': 80,
        'text-outline-width': 1.5,
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
    // {
    //   selector: 'node[summary]',
    //   style: {
    //     'width':  60, //ele => ele.data('gs_size') / 10,
    //     'height': 60, // ele => ele.data('gs_size') / 10,
    //     'background-color': 'gray',
    //     'text-outline-color': 'gray'
    //   }
    // },
    {
      selector: 'edge',
      style: {
        'line-color' : '#b1d6d8',
        'line-opacity': 0.6,
        'curve-style': 'haystack',
        'haystack-radius': 0,
        'width': ele => ele.data('similarity_coefficient') * 20,
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
        'opacity': 0.2
      }
    },
    {
      selector: 'edge.unselected',
      style: {
        'opacity': 0.1
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 6,
        'border-color': '#aadafa',
        'border-opacity': 0.666
      }
    },
    {
      selector: 'node.eh-preview',
      style: {
        'overlay-opacity': 0.2
      }
    },
    {
      selector: '.eh-handle',
      style: {
        'opacity': 0,
        'events': 'no'
      }
    },
    {
      selector: '.eh-ghost-edge.eh-preview-active',
      style: {
        'opacity': 0
      }
    }
  ];
};

export default DEFAULT_NETWORK_STYLE;