import React from 'react';
import PropTypes from 'prop-types';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { NetworkEditorController } from './controller';
import { MenuList, MenuItem, ListItemIcon, ListItemText } from '@material-ui/core';
import { getSVGString } from './legend-svg';
import { NODE_COLOR_SVG_ID } from './legend-button';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
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


async function createNetworkImageBlob(controller, imageSize, imageArea=ImageArea.FULL) {
  return await controller.cy.png({
    output: 'blob-promise',
    bg: 'white',
    full: imageArea === ImageArea.FULL,
    scale: imageSize.scale,
  });
}

async function createSVGLegendBlob(svgID) {
  const svg = getSVGString(svgID);
  return new Blob([svg], { type: 'text/plain;charset=utf-8' });
}

async function clearSelectionStyle(controller) {
  const eles = controller.cy.elements('.unselected');
  eles.removeClass('unselected');
  return async () => eles.addClass('unselected');
}

async function handleExportImageArchive(controller) {
  const restoreStyle = await clearSelectionStyle(controller);

  const blobs = await Promise.all([
    createNetworkImageBlob(controller, ImageSize.SMALL),
    createNetworkImageBlob(controller, ImageSize.MEDIUM),
    createNetworkImageBlob(controller, ImageSize.LARGE),
    createSVGLegendBlob(NODE_COLOR_SVG_ID),
  ]);

  restoreStyle();

  const zip = new JSZip();
  zip.file('enrichment_map_small.png',  blobs[0]);
  zip.file('enrichment_map_medium.png', blobs[1]);
  zip.file('enrichment_map_large.png',  blobs[2]);
  zip.file('node_color_legend.svg',     blobs[3]);

  const archiveBlob = await zip.generateAsync({ type: 'blob' });

  await saveAs(archiveBlob, 'enrichment_map_images.zip');
}


function handleCopyToClipboard() {
  const url = window.location.href;
  navigator.clipboard.writeText(url);
}


export function ShareMenu({ controller, onClose = ()=>null, showMessage = ()=>null }) {
  const handleCopyLink = async () => {
    await handleCopyToClipboard(); 
    onClose();
    showMessage("Link copied to clipboard");
  };

  const handleExportImages = async () => {
    await handleExportImageArchive(controller); 
    onClose();
  };

  return (
    <MenuList>
      <MenuItem onClick={handleCopyLink}>
        <ListItemIcon>
          <LinkIcon />
        </ListItemIcon>
        <ListItemText>Share Link to Network</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleExportImages}>
        <ListItemIcon>
          <CloudDownloadIcon />
        </ListItemIcon>
        <ListItemText>Save Network Images</ListItemText>
      </MenuItem>
    </MenuList>
  );
}
ShareMenu.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  onClose: PropTypes.func,
  showMessage: PropTypes.func
};

export default ShareMenu;