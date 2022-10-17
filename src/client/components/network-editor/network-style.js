import _ from 'lodash';

export const NODE_BG_COLOR = {
  start: '#3baa71', // best nodes (low p-val)
  end: '#72877c' // worst nodes
};

const nodeLabel = _.memoize(node => {
  const text = node.data('name');
  const percent = text.indexOf('%');

  if (percent > 0) {
    return text.substring(0, percent).toLowerCase();
  } else {
    return text;
  }
}, node => node.id());

export const DEFAULT_NETWORK_STYLE = (minQVal, maxQVal) => [
  {
    selector: 'node',
    style: {
      'opacity': 1,
      'border-width': 0,
      'border-opacity': 0.7,
      'label': nodeLabel,
      'width':  40, //ele => ele.data('gs_size') / 10,
      'height': 40, // ele => ele.data('gs_size') / 10,
      'font-size': '8px',
      'text-valign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': 80,
    }
  },
  {
    selector: 'node[padj]',
    style: {
      'background-color': `mapData(padj, ${minQVal || 0}, ${maxQVal || 1.0}, ${NODE_BG_COLOR.start}, ${NODE_BG_COLOR.end})`,
      'text-outline-color': `mapData(padj, ${minQVal || 0}, ${maxQVal || 1.0}, ${NODE_BG_COLOR.start}, ${NODE_BG_COLOR.end})`,
      'text-outline-width': 1.5,
      'text-outline-opacity': 1,
      'color': '#fff',
    }
  },
  {
    selector: 'edge',
    style: {
      'line-color' : '#b1d6d8',
      'line-opacity': 0.6,
      'curve-style': 'haystack',
      'haystack-radius': 0.1,
      'width': ele => ele.data('similarity_coefficient') * 6,
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
      'text-max-width': 250,
      'color': '#000',
      'font-size': '24px',
      'text-valign':'top',
      'background-color': '#888',
      'background-opacity': 0,
      'border-width': 0,
      'shape': 'round-rectangle',
      'padding': 10,
      'compound-sizing-wrt-labels': 'exclude',
      'background-image-opacity': 0.2,
      'background-image': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAMKADAAQAAAABAAAAMAAAAADbN2wMAAACMklEQVRoBe2Zu0oDQRiF4xVFKwVRLNL5AiKksckriJX4Br5GKisFUQJCnsFCLMTSRnyB9MELaGUhYtTvFANxZ8Ds7mRmgnvgsLnM/P85s7uzM//WahWqEfjfIzDhyf4kcRqwCbfgBlyDi1B4g4+wC+/hDbyFfRgV62RvwR78zkkZOoR1GBzLZDyC7zCv8Gz7D2KcwRUYBLtkeYZZIWW/vxJzf5QOZgh+MgLhWePn5Jj1bWSegJcBxBsz1+Ra8GVCI38VUPygCS9noh1BvDGhy6kU9uhtgsU6Fr6xNa29JGBAs1OhKfY0AfHmrOs5kQt1WusBYwLEPkqLNFnQGsaFA37U7JMKpEWahsIUrbROiT3q2fzSJG1/YpsW2c6pfJe2X3BdQloSpwpLm8vAZqrq0WVpcxnQZiRVWNpcBlZTVY8uS5trS/lJw6Hu9ghG++ScHszrOgOD/yf/2WVAG/BUYWlzGXhIVT26LG0uA92EDVjaXAbuEjZgaXMZUNEpVQylTaZ6MJX1j9EhTdaAWz/Q6At2YGroIEjahoJKhu/QuI99lBZpygWVDmMLN/mlJTeW6PEETZBYR5UxVYsthB16xRJu8qoWWwrH9DbBQh9Viy0Nrf4uYGjxqsVqM+8Fc0QJaeKKfCooe4XORIjLqU0ebyPvGgHd2KOYnVTGVC02CJbI4vMVk8qYheqfZd3q6diCPZj3Jvfyks+1Jy5iSmuqBmzCLajqwVi8ZkVnhWoExnoEfgA+cPY1qSYx3wAAAABJRU5ErkJggg==',
      'background-width': '100%',
      'background-height': '100%',
      'background-position-x': '50%',
      'background-position-y': '50%'
    }
  },
  {
    selector: 'edge.within-cluster',
    style: {
      'line-color': '#fff',
      'line-opacity': 0.6
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

export default DEFAULT_NETWORK_STYLE;