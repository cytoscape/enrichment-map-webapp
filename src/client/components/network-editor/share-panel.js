import React from 'react';
import PropTypes from 'prop-types';
import { saveAs } from 'file-saver';
import { NetworkEditorController } from './controller';
import { MenuList, MenuItem, ListItemIcon, ListItemText } from '@material-ui/core';
import EmailIcon from '@material-ui/icons/Email';
import ImageIcon from '@material-ui/icons/Image';
//import LinkIcon from '@material-ui/icons/Link';


const ImageSize = {
  SMALL:  { value:'SMALL',  scale: 0.3 },
  MEDIUM: { value:'MEDIUM', scale: 1.0 },
  LARGE:  { value:'LARGE',  scale: 3.0 },
};

const ImageArea = {
  FULL: 'full',
  VIEW: 'view',
};


function handleSendEmail() {
  const subject = "Sharing Network from EnrichmentMap";
  const body = "Use this link to access the network: " + window.location.href;
  window.location=`mailto:?subject=${subject}&body=${body}`;
}

async function handleExportImage(controller, imageSize, imageArea) {
  const blob = await controller.cy.png({
    output:'blob-promise',
    bg: 'white',
    full: imageArea === ImageArea.FULL,
    scale: imageSize.scale,
  });

  saveAs(blob, 'enrichment_map.png');
}

async function handleShareURL() {
  const url = window.location.href;
  window.navigator.share({
    title: "EnrichmentMap Network",
    url
  });
}

function handleExportLegend(controller, imageSize) {
  controller.bus.emit('exportLegend', imageSize.scale);
}


export function ShareMenu({ controller }) {
  return <MenuList>
      {/* <MenuItem onClick={handleShareURL}>
        <ListItemIcon>
          <LinkIcon />
        </ListItemIcon>
        <ListItemText>Share Link</ListItemText>
      </MenuItem> */}
      <MenuItem onClick={handleSendEmail}>
        <ListItemIcon>
          <EmailIcon />
        </ListItemIcon>
        <ListItemText>Send by email</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => handleExportImage(controller, ImageSize.LARGE, ImageArea.FULL)}>
        <ListItemIcon>
          <ImageIcon />
        </ListItemIcon>
        <ListItemText>Save Network Image</ListItemText>
      </MenuItem>
      {/* <MenuItem onClick={() => handleExportLegend(controller, ImageSize.MEDIUM)}>
        <ListItemIcon>
          <ImageIcon />
        </ListItemIcon>
        <ListItemText>Save Legend Image</ListItemText>
      </MenuItem> */}
    </MenuList>;
}


ShareMenu.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
};

export default ShareMenu;