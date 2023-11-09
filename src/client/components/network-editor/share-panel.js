import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { NetworkEditorController } from './controller';
import { MenuList, MenuItem, ListItemIcon, ListItemText, Popover } from '@material-ui/core';
import { getSVGString } from './legend-svg';
import { NODE_COLOR_SVG_ID } from './legend-button';
import InsertDriveFileOutlinedIcon from '@material-ui/icons/InsertDriveFileOutlined';
import LinkIcon from '@material-ui/icons/Link';


const ImageSize = {
  SMALL:  { value:'SMALL',  scale: 0.3 },
  MEDIUM: { value:'MEDIUM', scale: 1.0 },
  LARGE:  { value:'LARGE',  scale: 3.0 },
};

const ImageArea = {
  FULL: 'full',
  VIEW: 'view',
};

function stringToBlob(str) {
  return new Blob([str], { type: 'text/plain;charset=utf-8' });
}

function wait(millis, value="") {
  return new Promise(resolve => setTimeout(resolve, millis, value));
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


async function createNetworkImageBlob(controller, imageSize, imageArea=ImageArea.FULL) {
  return await controller.cy.png({
    output: 'blob-promise',
    bg: 'white',
    full: imageArea === ImageArea.FULL,
    scale: imageSize.scale,
  });
}


async function createSVGLegendBlob(svgID) {
  const svgStr = getSVGString(svgID);
  return stringToBlob(svgStr);
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
    // createSVGLegendBlob(NODE_COLOR_SVG_ID), // TODO fix the SVG legend
  ]);

  const zip = new JSZip();
  zip.file('enrichment_map_small.png',  blobs[0]);
  zip.file('enrichment_map_medium.png', blobs[1]);
  zip.file('enrichment_map_large.png',  blobs[2]);
  // zip.file('node_color_legend.svg',     blobs[3]); // TODO

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

  const handleExportImages = async () => {
    onClose();
    setImageExportEnabled(false);
    await handleExportImageArchive(controller);
    setImageExportEnabled(true); 
  };

  const handleExportData = async () => {
    onClose();
    setDataExportEnabled(false);

    const dataExportPromise = handleExportDataArchive(controller);

    const value = await Promise.race([ dataExportPromise, wait(1000,"waiting") ]);

    if(value === "waiting") // if the "waiting" promise resolved first then show a progress indicator
      snack.showSpinner("Exporting enrichment data...");

    await dataExportPromise; // wait for the export to finish
    snack.close();
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