import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { saveAs } from 'file-saver';

import { NetworkEditorController } from './controller';

import { Button, ClickAwayListener, TextField, Tooltip, Divider } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import LinkIcon from '@material-ui/icons/Link';
import EmailIcon from '@material-ui/icons/Email';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import ImageIcon from '@material-ui/icons/Image';


const useStyles = makeStyles((theme) => ({
  popoverHeading: {
    display: 'flex',
    flexDirection: 'row',
    gap: '2px',
    fontSize: '1.25em',
    fontWeight: 'bold',
    paddingBottom: '0.5em',
    marginLeft: '-0.5em',
    marginRight: '-0.5em',
    paddingLeft: '1em',
    paddingRight: '1em',
    alignItems: 'center'
  },
  popoverContent: {
    width: '450px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  popoverButtons: {
    display: 'flex',
    flexDirection: 'row',
    gap: '5px'
  }
}));


const ImageSize = {
  SMALL:  { value:'SMALL',  scale: 0.3 },
  MEDIUM: { value:'MEDIUM', scale: 1.0 },
  LARGE:  { value:'LARGE',  scale: 3.0 },
};

const ImageArea = {
  FULL: 'full',
  VIEW: 'view',
};


function handleOpenEmail() {
  const subject = "Sharing Network from EnrichmentMap";
  const body = "Here is the network: " + window.location.href;
  window.location=`mailto:?subject=${subject}&body=${body}`;
}

function handleCopyToClipboard() {
  navigator.clipboard.writeText(window.location.href);
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

function handleExportLegend(controller, imageSize) {
  controller.bus.emit('exportLegend', imageSize.scale);
}



function SharePanel({ controller }) {
  const [ tooltipOpen, setTooltipOpen ] = useState(false);

  const classes = useStyles();

  // eslint-disable-next-line react/prop-types
  function SectionHeader({ icon, text }) {
    return <div className={classes.popoverHeading}> {icon} &nbsp; {text} </div>;
  }

  const ShareLinkForm = () => (
    <div className={classes.popoverContent}>
      <SectionHeader icon={<LinkIcon/>} text="Share Link to Network" />
      <TextField defaultValue={window.location.href} variant="outlined" size="small" />
      <div className={classes.popoverButtons}>
        <Button variant='contained' startIcon={<EmailIcon />} onClick={handleOpenEmail}>
          Send by email
        </Button>
        <ClickAwayListener onClickAway={() => setTooltipOpen(false)}>
          <div> 
            <Tooltip arrow disableFocusListener disableHoverListener disableTouchListener
              PopperProps={{ disablePortal: true }}
              onClose={() => setTooltipOpen(false)}
              open={tooltipOpen}
              placement="right"
              title="Copied!"
            >
              <Button variant='contained' 
                startIcon={<FileCopyIcon />} 
                onClick={() => { handleCopyToClipboard(); setTooltipOpen(true); }}> 
                Copy to Clipboard
              </Button>
            </Tooltip>
          </div>
        </ClickAwayListener>
      </div>
    </div>
  );

  const ExportImageForm = () => (
    <div className={classes.popoverContent}>
      <SectionHeader icon={<ImageIcon />} text="Export Image" />
      <div className={classes.popoverButtons}>
        <Button variant='contained' 
          startIcon={<ImageIcon />} 
          onClick={() => handleExportImage(controller, ImageSize.LARGE, ImageArea.FULL)}>
          Export Network
        </Button>
        <Button variant='contained' 
          startIcon={<ImageIcon />} 
          onClick={() => handleExportLegend(controller, ImageSize.MEDIUM)}>
          Export Legend
        </Button>
      </div>
    </div>
  );

  return <>
    <ShareLinkForm />
    <Divider />
    <ExportImageForm />
  </>;
}

SharePanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
};

export default SharePanel;