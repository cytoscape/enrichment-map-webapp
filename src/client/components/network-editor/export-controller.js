import JSZip from 'jszip';
import { Canvg, presets } from 'canvg';
import { saveAs } from 'file-saver';
import { getLegendSVG } from './legend-svg';
// eslint-disable-next-line no-unused-vars
import { NetworkEditorController } from './controller';


// Sizes of exported PNG images
export const ImageSize = {
  SMALL:  { value:'SMALL',  scale: 0.5 },
  MEDIUM: { value:'MEDIUM', scale: 1.0 },
  LARGE:  { value:'LARGE',  scale: 2.0 },
};


export class ExportController {

  /**
   * @param {NetworkEditorController} controller
   */
  constructor(controller) {
    this.controller = controller;
    this.cy = controller.cy;
  }

  async exportArchive() {
    const netID = this.cy.data('id');
  
    const fetchExport = async path => {
      const res = await fetch(path);
      return await res.text();
    };
  
    const blobs = await Promise.all([
      this._createNetworkImageBlob(ImageSize.SMALL),
      this._createNetworkImageBlob(ImageSize.MEDIUM),
      this._createNetworkImageBlob(ImageSize.LARGE),
      this._createSVGLegendBlob()
    ]);
    const files = await Promise.all([
      fetchExport(`/api/export/enrichment/${netID}`),
      fetchExport(`/api/export/ranks/${netID}`),
      fetchExport(`/api/export/gmt/${netID}`),
    ]);
  
    const zip = new JSZip();
    zip.file('images/enrichment_map_small.png',  blobs[0]);
    zip.file('images/enrichment_map_medium.png', blobs[1]);
    zip.file('images/enrichment_map_large.png',  blobs[2]);
    zip.file('images/node_color_legend_NES.svg', blobs[3]);
    zip.file('data/enrichment_results.txt', files[0]);
    zip.file('data/ranks.txt', files[1]);
    zip.file('data/gene_sets.gmt', files[2]);
  
    const fileName = this._getZipFileName('enrichment');
    this._saveZip(zip, fileName);
  }

  async exportGeneList(genesJSON, pathways) { // used by the gene list panel (actually left-drawer.js)
    if(pathways.length == 0)
      return;

    let fileName = 'gene_ranks.zip';
    if(pathways.length == 1)
      fileName = `gene_ranks_(${pathways[0]}).zip`;
    else if(pathways.length <= 3)
      fileName = `gene_ranks_(${pathways.slice(0,3).join(',')}).zip`;
    else
      fileName = `gene_ranks_${pathways.length}_pathways.zip`;

    const geneLines = ['gene\trank'];
    for(const { gene, rank } of genesJSON) {
      geneLines.push(`${gene}\t${rank}`);
    }
    const genesText = geneLines.join('\n');
    const pathwayText = pathways.join('\n');
  
    const zip = new JSZip();
    zip.file('gene_ranks.txt', genesText);
    zip.file('pathways.txt', pathwayText);

    this._saveZip(zip, fileName);
  }

  async _createNetworkImageBlob(imageSize) {
    const { cy, bubbleSets } = this.controller;
    const renderer = cy.renderer();
  
    // render the network to a buffer canvas
    const cyoptions = {
      output: 'blob',
      bg: 'white',
      full: true, // full must be true for the calculations below to work
      scale: imageSize.scale,
    };
    const cyCanvas = renderer.bufferCanvasImage(cyoptions);
    const { width, height } = cyCanvas;
  
    // compute the transform to be applied to the bubbleSet svg layer
    // this code was adapted from the code in renderer.bufferCanvasImage()
    var bb = cy.elements().boundingBox();
    const pxRatio = renderer.getPixelRatio();
    const scale = imageSize.scale * pxRatio;
    const dx = -bb.x1 * scale;
    const dy = -bb.y1 * scale;
    const transform = `translate(${dx},${dy})scale(${scale})`;
  
    // get the bubbleSet svg element
    const svgElem = bubbleSets.layer.node.parentNode.cloneNode(true);
    svgElem.firstChild.setAttribute('transform', transform); // firstChild is a <g> tag
  
    // render the bubbleSet svg layer using Canvg library
    const svgCanvas = new OffscreenCanvas(width, height);
    const ctx = svgCanvas.getContext('2d');
    const svgRenderer = await Canvg.from(ctx, svgElem.innerHTML, presets.offscreen());
    await svgRenderer.render();
  
    // combine the layers
    const combinedCanvas = new OffscreenCanvas(width, height);
    const combinedCtx = combinedCanvas.getContext('2d');
    combinedCtx.drawImage(cyCanvas,  0, 0);
    combinedCtx.drawImage(svgCanvas, 0, 0);
  
    const blob = await combinedCanvas.convertToBlob();
    return blob;
  }

  async _createSVGLegendBlob() {
    const svg = getLegendSVG(this.controller);
    return new Blob([svg], { type: 'text/plain;charset=utf-8' });
  }
   
  _getZipFileName(suffix) {
    const networkName = this.cy.data('name');
    if(networkName) {
      // eslint-disable-next-line no-control-regex
      const reserved = /[<>:"/\\|?*\u0000-\u001F]/g;
      if(!reserved.test(networkName)) {
        return `${networkName}_${suffix}.zip`;
      }
    }
    return `enrichment_map_${suffix}.zip`;
  }

  async _saveZip(zip, fileName) {
    const archiveBlob = await zip.generateAsync({ type: 'blob' });
    await saveAs(archiveBlob, fileName);
  }

}