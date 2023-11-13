import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { NetworkEditorController } from './controller';
import { MenuList, MenuItem, ListItemIcon, ListItemText, Popover } from '@material-ui/core';
import { getLegendSVG } from './legend-svg';
import InsertDriveFileOutlinedIcon from '@material-ui/icons/InsertDriveFileOutlined';
import LinkIcon from '@material-ui/icons/Link';
import { Canvg, presets } from 'canvg';


const ImageSize = {
  SMALL:  { value:'SMALL',  scale: 0.5 },
  MEDIUM: { value:'MEDIUM', scale: 1.0 },
  LARGE:  { value:'LARGE',  scale: 2.0 },
};

function stringToBlob(str) {
  return new Blob([str], { type: 'text/plain;charset=utf-8' });
}


export async function saveGeneList(genesJSON, pathways) { // used by the gene list panel (actually left-drawer.js)
  const lines = ['gene\trank'];
  for(const { gene, rank } of genesJSON) {
    lines.push(`${gene}\t${rank}`);
  }
  const fullText = lines.join('\n');
  const blob = stringToBlob(fullText);

  let fileName = 'gene_ranks.txt';
  if(pathways && pathways.length == 1) {
    fileName = `gene_ranks_(${pathways[0]}).txt`;
  } else if(pathways && pathways.length > 1) {
    fileName = `gene_ranks_${pathways.length}_pathways.txt`;
  }

  saveAs(blob, fileName);
}


async function createNetworkImageBlob(controller, imageSize) {
  const { cy, bubbleSets } = controller;
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

async function createSVGLegendBlob(controller) {
  const svg = getLegendSVG(controller);
  return new Blob([svg], { type: 'text/plain;charset=utf-8' });
}


function getZipFileName(controller, suffix) {
  const networkName = controller.cy.data('name');
  if(networkName) {
    // eslint-disable-next-line no-control-regex
    const reserved = /[<>:"/\\|?*\u0000-\u001F]/g;
    if(!reserved.test(networkName)) {
      return `${networkName}_${suffix}.zip`;
    }
  }
  return `enrichment_map_${suffix}.zip`;
}


async function saveZip(controller, zip, type) {
  const archiveBlob = await zip.generateAsync({ type: 'blob' });
  const fileName = getZipFileName(controller, type);
  await saveAs(archiveBlob, fileName);
}


async function handleExportImageArchive(controller) {
  const blobs = await Promise.all([
    createNetworkImageBlob(controller, ImageSize.SMALL),
    createNetworkImageBlob(controller, ImageSize.MEDIUM),
    createNetworkImageBlob(controller, ImageSize.LARGE),
    createSVGLegendBlob(controller)
  ]);

  const zip = new JSZip();
  zip.file('enrichment_map_small.png',  blobs[0]);
  zip.file('enrichment_map_medium.png', blobs[1]);
  zip.file('enrichment_map_large.png',  blobs[2]);
  zip.file('node_color_legend_NES.svg', blobs[3]);

  saveZip(controller, zip, 'images');
}


async function handleExportDataArchive(controller) {
  const netID = controller.networkIDStr;

  const fetchExport = async path => {
    const res = await fetch(path);
    return await res.text();
  };

  const files = await Promise.all([
    fetchExport(`/api/export/enrichment/${netID}`),
    fetchExport(`/api/export/ranks/${netID}`),
    fetchExport(`/api/export/gmt/${netID}`),
  ]);

  const zip = new JSZip();
  zip.file('enrichment_results.txt', files[0]);
  zip.file('ranks.txt', files[1]);
  zip.file('gene_sets.gmt', files[2]);

  saveZip(controller, zip, 'enrichment');
}


function handleCopyToClipboard() {
  const url = window.location.href;
  navigator.clipboard.writeText(url);
}


function snackBarOps(setSnackBarState) {
  return {
    close: () => setSnackBarState({ open: false }),
    showMessage: message => setSnackBarState({ open: true, closeable: true, autoHideDelay: 3000, message }),
    showSpinner: message => setSnackBarState({ open: true, closeable: false, spinner: true, message }),
  };
}


export function ShareMenu({ controller, target, visible, onClose = ()=>null, setSnackBarState = ()=>null }) {
  const [ imageExportEnabled, setImageExportEnabled ] = useState(true);
  const [ dataExportEnabled,  setDataExportEnabled  ] = useState(true);

  const snack = snackBarOps(setSnackBarState);

  const handleCopyLink = async () => {
    onClose();
    await handleCopyToClipboard(); 
    snack.showMessage("Link copied to clipboard");
  };

  const spinnerUntilDone = async (promise, message) => {
    const delay = (millis) => new Promise(r => setTimeout(r, millis, 'delay'));

    // Only show spinner if it takes longer than the inital delay
    const value = await Promise.race([ promise, delay(500) ]);
    if(value === 'delay') // if the delay promise finished first
      snack.showSpinner(message);

    await promise; // wait for the export to finish if it hasn't already
    snack.close();
  };

  const handleExportImages = async () => {
    onClose();
    setImageExportEnabled(false);
    const promise = handleExportImageArchive(controller);
    await spinnerUntilDone(promise, "Exporting network images...");
    setImageExportEnabled(true); 
  };

  const handleExportData = async () => {
    onClose();
    setDataExportEnabled(false);
    const promise = handleExportDataArchive(controller);
    await spinnerUntilDone(promise, "Exporting enrichment data...");
    setDataExportEnabled(true);
  };

  return (
    <Popover
      id="menu-popover"
      anchorEl={target}
      open={visible && Boolean(target)}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      onClose={onClose}
    >
      <MenuList>
        <MenuItem onClick={handleCopyLink}>
          <ListItemIcon>
            <LinkIcon />
          </ListItemIcon>
          <ListItemText>Share Link to Network</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExportImages} disabled={!imageExportEnabled}>
          <ListItemIcon>
            <InsertDriveFileOutlinedIcon />
          </ListItemIcon>
          <ListItemText>Save Network Images</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExportData} disabled={!dataExportEnabled}>
          <ListItemIcon>
            <InsertDriveFileOutlinedIcon />
          </ListItemIcon>
          <ListItemText>Export Enrichment Data</ListItemText>
        </MenuItem>
      </MenuList>
    </Popover>
  );
}
ShareMenu.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  onClose: PropTypes.func,
  setSnackBarState: PropTypes.func,
  target: PropTypes.any,
  visible: PropTypes.bool,
};

export default ShareMenu;