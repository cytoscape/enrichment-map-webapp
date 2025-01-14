export function cyJsonToCx2(networkJson, positionsJson) {
  const cyNodes = networkJson.network.elements.nodes;
  const cyEdges = networkJson.network.elements.edges;

  const positionsMap = positionsJson.positions.reduce((map, pos) => {
    const { id, x, y } = pos;
    map.set(id, { x, y });
    return map;
  }, new Map());

  const nodeIDMap = cyNodes.reduce((map, node, i) => {
    const id = node.data.id;
    map.set(id, i);
    return map;
  }, new Map());

  let magNES = cyNodes.reduce((magNES, node) => {
    return Math.max(Math.abs(node.data.NES), magNES);
  }, 0);

  const metaData = [
    { name: "attributeDeclarations", elementCount: 1 }, 
    { name: "networkAttributes", elementCount: 1 }, 
    { name: "nodes", elementCount: cyNodes.length }, 
    { name: "edges", elementCount: cyEdges.length }, 
    { name: "visualProperties", elementCount: 1 }, 
    { name: "nodeBypasses", elementCount: 0 }, 
    { name: "edgeBypasses", elementCount: 0 }, 
    { name: "visualEditorProperties", elementCount: 1 }
  ];

  // TODO add network attributes for creation parameters
  const attributeDeclarations = [{
    networkAttributes: {
      "Network ID": { "d": "string" },
      "Name": { "d": "string" },
    },
    nodes: {
      "name": { "d": "string" },
      "description": { "d": "string" },
      "pvalue": { "d": "double" },
      "padj": { "d": "double" },
      "NES": { "d": "double" },
      "gs_size": { "d": "integer" },
    },
    edges: {
      "similarity_coefficient": { "d": "double" },
      "overlap_size": { "d": "integer" },
    }
  }];

  const networkAttributes = [{
    "Network ID": networkJson.networkIDStr,
    "Name": networkJson.networkName,
  }];

  const nodes = cyNodes.map(node => {
    const { data } = node;
    const id = nodeIDMap.get(data.id);
    const { x, y } = positionsMap.get(data.id);
    return {
      id, x, y,
      v: {
        "name": data.name[0],
        "description": data.description[0],
        "pvalue": data.pvalue,
        "padj": data.padj,
        "NES": data.NES,
        "gs_size": data.gs_size,
      }
    };
  });

  const edges = cyEdges.map((edge, index) => {
    const { data } = edge;
    const edgeID = index + cyNodes.length + 1; // not sure of edge IDs can overlap with node IDs
    const sourceID = nodeIDMap.get(data.source);
    const targetID = nodeIDMap.get(data.target);
    return {
      id: edgeID,
      s: sourceID,
      t: targetID,
      v: {
        "similarity_coefficient": data.similarity_coefficient,
        "overlap_size": data.overlap_size,
      }
    };
  });

  const visualProperties = [{
    "default": {
      "network": {
          "NETWORK_BACKGROUND_COLOR": "#FFFFFF"
      },
      "edge": {
          "EDGE_LABEL": "",
          "EDGE_LABEL_COLOR": "#000000",
          "EDGE_LABEL_FONT_FACE": {
            "FONT_FAMILY": "serif",
            "FONT_STYLE": "normal",
            "FONT_WEIGHT": "normal"
          },
          "EDGE_LABEL_FONT_SIZE": 12,
          "EDGE_LABEL_OPACITY": 1,
          "EDGE_LABEL_ROTATION": 0,
          "EDGE_LABEL_MAX_WIDTH": 100,
          "EDGE_LINE_STYLE": "solid",
          "EDGE_OPACITY": 0.3,
          "EDGE_SELECTED_PAINT": "red",
          "EDGE_SOURCE_ARROW_COLOR": "#000000",
          "EDGE_SOURCE_ARROW_SHAPE": "none",
          "EDGE_LINE_COLOR": "#000000",
          "EDGE_TARGET_ARROW_COLOR": "#000000",
          "EDGE_TARGET_ARROW_SHAPE": "none",
          "EDGE_VISIBILITY": "element",
          "EDGE_WIDTH": 1,
          "EDGE_Z_LOCATION": 0
      },
      "node": {
        "NODE_BORDER_COLOR": "#000000",
        "NODE_BORDER_STYLE": "solid",
        "NODE_BORDER_OPACITY": 1,
        "NODE_BORDER_WIDTH": 1,
        "NODE_BACKGROUND_COLOR": "#FFFFFF",
        "NODE_HEIGHT": 40,
        "NODE_LABEL": "",
        "NODE_LABEL_COLOR": "#000000",
        "NODE_LABEL_FONT_FACE": {
          "FONT_FAMILY": "serif",
          "FONT_STYLE": "normal",
          "FONT_WEIGHT": "normal"
        },
        "NODE_LABEL_FONT_SIZE": 12,
        "NODE_LABEL_OPACITY": 1,
        "NODE_LABEL_POSITION": {
          "HORIZONTAL_ALIGN": "center",
          "VERTICAL_ALIGN": "center",
          "HORIZONTAL_ANCHOR": "center",
          "VERTICAL_ANCHOR": "center",
          "JUSTIFICATION": "center",
          "MARGIN_X": 0,
          "MARGIN_Y": 0
        },
        "NODE_LABEL_ROTATION": 0,
        "NODE_LABEL_MAX_WIDTH": 100,
        "NODE_BACKGROUND_OPACITY": 1,
        "NODE_SELECTED_PAINT": "yellow",
        "NODE_SHAPE": "ellipse",
        "NODE_VISIBILITY": "element",
        "NODE_WIDTH": 40,
        "NODE_Z_LOCATION": 0
      }
    },
    "nodeMapping": {
      "NODE_BACKGROUND_COLOR": {
        "type": "CONTINUOUS",
        "definition": {
          "attribute": "NES",
          "map": [{
              "max": -magNES,
              "maxVPValue": "blue",
              "includeMax": false,
              "includeMin": false
            }, {
              "min": -magNES,
              "max": 0,
              "minVPValue": "blue",
              "maxVPValue": "white",
              "includeMin": true,
              "includeMax": true
            }, {
              "min": 0,
              "max": magNES,
              "minVPValue": "white",
              "maxVPValue": "red",
              "includeMin": true,
              "includeMax": true
            }, {
              "min": magNES,
              "minVPValue": "red",
              "includeMin": false,
              "includeMax": false
            }
          ]
        }
      },
      "NODE_LABEL": {
        "type": "PASSTHROUGH",
        "definition": {
          "attribute": "description"
        }
      }
    },
    "edgeMapping": {
      "EDGE_WIDTH": {
        "type": "CONTINUOUS",
        "definition": {
            "attribute": "similarity_coefficient",
            "map": [{
                "max": 0.25,
                "maxVPValue": 1,
                "includeMax": false,
                "includeMin": false
              }, {
                "min": 0.25,
                "max": 1,
                "minVPValue": 1,
                "maxVPValue": 10,
                "includeMin": true,
                "includeMax": true
              }, {
                "min": 1,
                "minVPValue": 10,
                "includeMin": false,
                "includeMax": false
              }
            ],
          }
        }
      }
    }
  ];

  const status = [{
    error: "",
    success: true
  }];

  return [
    {
      "CXVersion": "2.0",
      "hasFragments": false
    },
    { metaData },
    { attributeDeclarations },
    { networkAttributes },
    { nodes },
    { edges },
    { visualProperties },
    { status }
  ];
}
