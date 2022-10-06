import React from 'react';
import PropTypes from 'prop-types';
import { saveAs } from 'file-saver';

import { NetworkEditorController } from './controller';
import { Button, ClickAwayListener, TextField, Tooltip, Divider } from '@material-ui/core';

import LinkIcon from '@material-ui/icons/Link';
import EmailIcon from '@material-ui/icons/Email';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import ImageIcon from '@material-ui/icons/Image';


const ImageSize = {
  SMALL:  { value:'SMALL',  scale: 0.3 },
  MEDIUM: { value:'MEDIUM', scale: 1.0 },
  LARGE:  { value:'LARGE',  scale: 3.0 },
};

const ImageArea = {
  FULL: 'full',
  VIEW: 'view',
};

export class SharePanel extends React.Component {

  constructor(props) {
    super(props);
    this.url = window.location.href;
    this.controller = props.controller;
    this.state = {
      tooltipOpen: false,
      imageSize: ImageSize.LARGE,
      imageArea: ImageArea.FULL,
      legendSize: ImageSize.MEDIUM,
    };
  }

  handleOpenEmail() {
    const subject = "Sharing Network from EnrichmentMap";
    const body = "Here is the network: " + this.url;
    window.location=`mailto:?subject=${subject}&body=${body}`;
  }

  handleCopyToClipboard() {
    navigator.clipboard.writeText(this.url);
  }

  async handleExportImage() {
    const { cy } = this.controller;
    const { imageSize, imageArea } = this.state;

    const blob = await cy.png({
      output:'blob-promise',
      bg: 'white',
      full: imageArea === ImageArea.FULL,
      scale: imageSize.scale,
    });

    saveAs(blob, 'enrichment_map.png');
  }

  handleExportLegend() {
    this.controller.bus.emit('exportLegend', this.state.legendSize.scale);
  }

  handlePopoverOpen() {
    this.setState({
      tooltipOpen: false 
    });
  }

  handlePopoverClose() {
    this.setState({
      tooltipOpen: false 
    });
  }

  handleTooltip(tooltipOpen) {
    this.setState({ tooltipOpen });
  }

  render() {
    const SectionHeader = ({ icon, text }) => 
      <div className='share-button-popover-heading'> {icon} &nbsp; {text} </div>;

    const ShareLinkForm = () => (
      <div className='share-button-popover-content'>
        <SectionHeader icon={<LinkIcon/>} text="Share Link to Network" />
        <TextField defaultValue={this.url} variant="outlined" size="small" />
        <div className='share-button-popover-buttons'>
          <Button variant='contained' startIcon={<EmailIcon />} onClick={() => this.handleOpenEmail()}>
            Send by email
          </Button>
          <ClickAwayListener onClickAway={() => this.handleTooltip(false)}>
            <div> 
              <Tooltip arrow disableFocusListener disableHoverListener disableTouchListener
                PopperProps={{ disablePortal: true }}
                onClose={() => this.handleTooltip(false)}
                open={this.state.tooltipOpen}
                placement="right"
                title="Copied!"
              >
                <Button variant='contained' startIcon={<FileCopyIcon />} onClick={() => { this.handleCopyToClipboard(); this.handleTooltip(true); }}> 
                  Copy to Clipboard
                </Button>
              </Tooltip>
            </div>
          </ClickAwayListener>
        </div>
      </div>
    );

    const ExportImageForm = () => (
      <div className='share-button-popover-content'>
        <SectionHeader icon={<ImageIcon />} text="Export Image" />
        <div className='share-button-popover-buttons'>
          <Button variant='contained' startIcon={<ImageIcon />} onClick={() => this.handleExportImage()}>
            Export Network
          </Button>
          <Button variant='contained' startIcon={<ImageIcon />} onClick={() => this.handleExportLegend()}>
            Export Legend
          </Button>
        </div>
      </div>
    );

    return (
      <>
        <ShareLinkForm />
        <Divider />
        <ExportImageForm />
      </>
    );
  }
}

SharePanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
};

export default SharePanel;