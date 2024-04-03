import JSZip from 'jszip';
import { Canvg, presets } from 'canvg';
import { saveAs } from 'file-saver';
import { getLegendSVG } from './legend-svg';
import dedent from 'dedent';
// eslint-disable-next-line no-unused-vars
import { NetworkEditorController } from './controller';


// Sizes of exported PNG images
export const ImageSize = {
  SMALL:  { value:'SMALL',  scale: 0.5 },
  MEDIUM: { value:'MEDIUM', scale: 1.0 },
  LARGE:  { value:'LARGE',  scale: 2.0 },
};

const Path = {
  IMAGE_FOLDER:  'images',
  IMAGE_SMALL:   'images/enrichment_map_small.png',
  IMAGE_MEDIUM:  'images/enrichment_map_medium.png',
  IMAGE_LARGE:   'images/enrichment_map_large.png',
  IMAGE_LEGEND:  'images/node_color_legend_NES.svg',
  DATA_FOLDER:   'data',
  DATA_ENRICH:   'data/enrichment_results.txt',
  DATA_RANKS:    'data/ranks.txt',
  DATA_GENESETS: 'data/gene_sets.gmt',
  README:        'README.md'
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
  
    // Let the fethching happen in the background while we generate the images
    const filesPromise = Promise.all([
      fetchExport(`/api/export/enrichment/${netID}`),
      fetchExport(`/api/export/ranks/${netID}`),
      fetchExport(`/api/export/gmt/${netID}`),
    ]);

    // Let image generation run in parallel with fetching data from server
    const blob0 = await this._createNetworkImageBlob(ImageSize.SMALL);
    const blob1 = await this._createNetworkImageBlob(ImageSize.MEDIUM);
    const blob2 = await this._createNetworkImageBlob(ImageSize.LARGE);
    const blob3 = await this._createSVGLegendBlob();
    const files = await filesPromise;
    const readme = createREADME(this.controller);
  
    const zip = new JSZip();
    zip.file(Path.IMAGE_SMALL,   blob0);
    zip.file(Path.IMAGE_MEDIUM,  blob1);
    zip.file(Path.IMAGE_LARGE,   blob2);
    zip.file(Path.IMAGE_LEGEND,  blob3);
    zip.file(Path.DATA_ENRICH,   files[0]);
    zip.file(Path.DATA_RANKS,    files[1]);
    zip.file(Path.DATA_GENESETS, files[2]);
    zip.file(Path.README,        readme);
  
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



function createREADME(controller) {
  const { cy } = controller;
  const name = cy.data('name');
  const link = window.location.href;
  const parameters = cy.data('parameters');

  return dedent`
    EnrichmentMap::RNA-Seq - ${name}
    -------------------------${'-'.repeat(name.length)}

    Network Permalink: ${link}

    EnrichmentMap is a web-app that allows you to perform functional enrichment analysis on 
    gene lists derived from RNA-seq experiments and visualise the results as a network.

    This archive contains the following files:
    * ${Path.IMAGE_LARGE}
    * ${Path.IMAGE_MEDIUM}
    * ${Path.IMAGE_SMALL}
      * Network PNG images in various sizes.
    * ${Path.IMAGE_LEGEND}
      * An SVG image of the NES color legend used for the nodes in the network.
    * ${Path.DATA_ENRICH}
      * Results of Gene Set Enrichment Analysis from the FGSEA R package.
    * ${Path.DATA_RANKS}
      * Gene ranks.
    * ${Path.DATA_GENESETS}
      * Gene sets (pathways) that correspond to nodes in the network.


    How to cite EnrichmentMap
    -------------------------
    To cite this app in a paper, for now, please cite this Nature Protocols 
    article (an article specific to this app will be published shortly):
    https://doi.org/10.1038/s41596-018-0103-9
    Reimand, J., Isserlin, R., ..., Bader, G.
    Pathway enrichment analysis and visualization of omics data using g:Profiler, GSEA, Cytoscape and EnrichmentMap.
    Nat Protoc 14, 482–517 (2019).


    Importing data into the Cytoscape EnrichmentMap App
    ---------------------------------------------------
    * Download and install Cytoscape
      * https://cytoscape.org/download.html
    * Download and install the EnrichmentMap App
      * https://apps.cytoscape.org/apps/enrichmentmap
    * (optional) If your network was created from an RNA-seq expression file you may copy 
      it to the '${Path.DATA_FOLDER}' folder.
    * Start Cytoscape.
    * Go to the main menu and select *Apps > EnrichmentMap*
    * Click the button that says *Add* then select *Scan a folder for enrichment data*.
    * Select the '${Path.DATA_FOLDER}' folder.
    * The three files contained in this archive will show up in the *Enrichments*, *GMT* 
      and *Ranks* fields in the dialog.
      * Note, if you copied the RNA-seq expression file to the zip output '${Path.DATA_FOLDER}' 
        folder it should also appear in the *Expressions* field. If it does not then rename 
        the file to include the word “expression”, then try again.
    * Click the *Build* button.
    * Documentation for the EnrichmentMap Cytoscape App is available here...
      * https://enrichmentmap.readthedocs.io/
    
    
    Gene-set filtering parameters
    -----------------------------
    The following cutoff parameters were used to filter the results of enrichment analysis.
    * Gene-sets with q-value (padj) greater than ${parameters.qvalue} are removed from the network.
    * Edges represent similarity between gene-sets. 
      * Similarity is calculated using the ${parameters.similarityMetric} method and must have a 
        value of at least ${parameters.similarityCutoff}.
      ${parameters.similarityMetric === 'JACCARD' ? 
      '* JACCARD coefficient is computed as the size of the intersection divided by the size of the union.' : ''
      }
  `;
}