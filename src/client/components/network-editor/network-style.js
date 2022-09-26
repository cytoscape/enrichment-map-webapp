export const DEFAULT_NETWORK_STYLE = [
  {
    selector: 'node',
    style: {
      'background-color': '#f0f0f0', //'mapData(colouring,-1.0,1.0,rgb(33,102,172),rgb(178,24,43))',
      'opacity': 0.8,
      'border-color': '#333333',
      'border-width': 1,
      'border-opacity': 0.7,
      'label': 'data(name)',
      'width':  40, //ele => ele.data('gs_size') / 10,
      'height': 40, // ele => ele.data('gs_size') / 10,
      'font-size': '6px',
      'text-valign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': 80,
    }
  },
  {
    selector: 'edge',
    style: {
      'line-color' : '#a6cee3', //'#404040',
      'line-opacity': 0.6,
      'curve-style': 'bezier',
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
      'background-opacity': 0.2,
      'border-color': '#2B65EC',
      'font-size': '24px',
      'text-valign':'top',
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