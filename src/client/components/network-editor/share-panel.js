import React from 'react';
import PropTypes from 'prop-types';
import { saveAs } from 'file-saver';

import { NetworkEditorController } from './controller';

import { Button, ClickAwayListener, FormLabel, Grid, TextField, Tooltip } from '@material-ui/core';
import { RadioGroup, Radio, FormControlLabel, FormControl, Divider } from '@material-ui/core';

import LinkIcon from '@material-ui/icons/Link';
import EmailIcon from '@material-ui/icons/Email';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import ImageIcon from '@material-ui/icons/Image';

const ImageSize = {
  SMALL:  { value:'SMALL',  scale: 0.3 },
  MEDIUM: { value:'MEDIUM', scale: 1.0 },
  LARGE:  { value:'LARGE',  scale: 3.0 },
};

const ImageType = {
  PNG: 'png',
  JPG: 'jpg',
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
      imageType: ImageType.PNG,
      imageSize: ImageSize.MEDIUM,
      imageArea: ImageArea.VIEW,
    };
  }

  handleOpenEmail() {
    const subject = "Sharing Network from Cytoscape Explore";
    const body = "Here is the network: " + this.url;
    window.location=`mailto:?subject=${subject}&body=${body}`;
  }

  handleCopyToClipboard() {
    navigator.clipboard.writeText(this.url);
  }

  async handleExportImage() {
    const { cy } = this.controller;
    const { imageType, imageSize, imageArea } = this.state;

    const blob = await cy[imageType]({
      output:'blob-promise',
      bg: 'white',
      full: imageArea === ImageArea.FULL,
      scale: imageSize.scale,
    });

    saveAs(blob, `cytoscape_explore.${imageType}`);
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

    const ExportImageForm = () => {
      const handleType = imageType => this.setState({ imageType }); 
      const handleSize = imageSize => this.setState({ imageSize: ImageSize[imageSize] });
      const handleArea = imageArea => this.setState({ imageArea });
      const ImageRadio = ({ label, value, onClick }) =>
        <FormControlLabel label={label} value={value} control={<Radio size='small' onClick={() => onClick(value)}/>} />;
      
      // Note: For some reason the RadioGroup.onChange handler does not fire, using Radio.onClick instead.
      // May have something to do with this: https://github.com/mui/material-ui/issues/9336
      return (
        <div className='share-button-popover-content'>
          <SectionHeader icon={<ImageIcon />} text="Export Image" />
          <div style={{ paddingLeft:'10px' }}>
            <Grid container alignItems="flex-start" spacing={3}>
              <Grid item>
                <FormControl>
                  <FormLabel>Size:</FormLabel>
                  <RadioGroup value={this.state.imageSize.value}>
                    <ImageRadio label="Small"  value={ImageSize.SMALL.value}  onClick={handleSize} />
                    <ImageRadio label="Medium" value={ImageSize.MEDIUM.value} onClick={handleSize} />
                    <ImageRadio label="Large"  value={ImageSize.LARGE.value}  onClick={handleSize} />
                  </RadioGroup>
                </FormControl>
              </Grid>
              <Grid item>
                <FormControl>
                  <FormLabel>Format:</FormLabel>
                  <RadioGroup value={this.state.imageType}>
                    <ImageRadio label="PNG" value={ImageType.PNG} onClick={handleType} />
                    <ImageRadio label="JPG" value={ImageType.JPG} onClick={handleType} />
                  </RadioGroup>
                </FormControl>
              </Grid>
              <Grid item>
                <FormControl>
                  <FormLabel>Area:</FormLabel>
                  <RadioGroup  value={this.state.imageArea}>
                    <ImageRadio label="Visible Area"   value={ImageArea.VIEW} onClick={handleArea} />
                    <ImageRadio label="Entire Network" value={ImageArea.FULL} onClick={handleArea} />
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>
          </div>
          <div className='share-button-popover-buttons'>
            <Button variant='contained' startIcon={<ImageIcon />} onClick={() => this.handleExportImage()}>
              Export Image
            </Button>
          </div>
        </div>
      );
    };

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