import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import chroma from 'chroma-js';

import { NETWORK_BACKGROUND } from '../defaults';
import { RecentNetworksController } from '../recent-networks-controller';

import { withStyles } from '@material-ui/core/styles';

import { Box, Paper, Grid } from '@material-ui/core';
import { Typography, Tooltip } from '@material-ui/core';
import { Popover, MenuList, MenuItem, ListItemIcon, ListItemText } from '@material-ui/core';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import { Button, IconButton } from '@material-ui/core';
import { Skeleton } from '@material-ui/lab';
import { Snackbar, SnackbarContent } from '@material-ui/core';
import Collapse from '@material-ui/core/Collapse';

import MoreVertIcon from '@material-ui/icons/MoreVert';
import DeleteIcon from '@material-ui/icons/Delete';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import CloseIcon from '@material-ui/icons/Close';
import CircularProgressIcon from '@material-ui/core/CircularProgress';
import { ShareIcon } from '../svg-icons';


const DEF_NETWORK_NAME = 'Untitled Network';
/** Transparent 1 pixel PNG */
const EMPTY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';


const useStyles = theme => ({
  paper: {
    whiteSpace: 'nowrap',
    boxShadow: 'none',
    border: 'none',
    borderRadius: '0 0 8px 8px',
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1, 2.75, 0, 2.75),
    [theme.breakpoints.down('xs')]: {
      padding: theme.spacing(0.5, 0.75, 0, 0.75),
    },
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  container: {
    display: 'grid',
    overflow: 'hidden',
    justifyContent: 'left',
  },
  imageList: {
    display: 'flex',
    listStyle: 'none',
    overflowY: 'auto',
    flexWrap: 'nowrap',
    webkitOverflowScrolling: 'touch',
    padding: theme.spacing(0, 0, 1.5, 0),
    transform: 'translateZ(0)', // Promote the list into his own layer on Chrome. This cost memory but helps keeping high FPS.
  },
  paperItem: {
    display: 'inline-block',
    margin: theme.spacing(0.5),
    padding: theme.spacing(0.5),
    cursor: 'pointer',
    border: `2px solid ${theme.palette.background.default}`,
    borderRadius: '8px',
    backgroundColor: theme.palette.background.default,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    }
  },
  paperItemSkeleton: {
    display: 'inline-block',
    margin: theme.spacing(0.5),
    padding: theme.spacing(0.5),
    cursor: 'default',
    border: `2px solid ${theme.palette.background.default}`,
    borderRadius: '8px',
    backgroundColor: theme.palette.background.default,
  },
  thumbnail: {
    width: 172,
    height: 148,
    objectFit: 'contain',
    borderRadius: 4,
    [theme.breakpoints.down('xs')]: {
      width: 148,
      height: 128,
    },
  },
  metadata: {
    textAlign: 'left',
    margin: 0,
    padding: theme.spacing(0.5, 0.25, 0.5, 0.25),
  },
  metadataSkeleton: {
    margin: 0,
    padding: '10px 2px 10px 2px',
  },
  name: {
    maxWidth: 160,
    margin: 0,
    padding: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    [theme.breakpoints.down('xs')]: {
      maxWidth: 132,
    },
  },
  caption: {
    color: theme.palette.secondary.main,
  },
  snackBar: {
    top: '10px',
    zOrder: 1000,
  },
  snackBarContent: {
    color: 'inherit',
    background: theme.palette.primary.main,
    border: `1px solid ${theme.palette.text.disabled}`,
  },
});


export class RecentNetworksList extends Component {

  constructor(props) {
    super(props);

    this.controller = this.props.recentNetworksController;

    this.state = {
      loading: false,
      length: 0,
      recentNetworks: null,
      currentItem: null,
      anchorEl: null,
      confirm: false,  // Whether or not to show the confirmation dialog
      confirmTitle: null, // Dialog title
      confirmText: null, // Dialog text
      confirmLabel: null, // OK button's label
      confirmFn: null, // Function to be executed after the action is confirmed through the confirmation dialog
      snackBarState: {
        open: false,
        message: "",
        autoHideDelay: 4000,
        closeable: true,
        spinner: false,
      },
    };

    this.clearRecentNetworks = this.clearRecentNetworks.bind(this);
    this.deleteCurrentNetwork = this.deleteCurrentNetwork.bind(this);

    this.snack = this.snackBarOps();
  }

  componentDidMount() {
    if (!this.state.recentNetworks)
      this.refresh();
  }

  refresh() {
    this.controller.getRecentNetworksLength((length) => {
      this.setState({
        loading: true,
        length: length,
        currentItem: null,
        anchorEl: null,
      }, () => {
        this.controller.getRecentNetworks('opened', (recentNetworks) => {
          this.setState({
            loading: false,
            length: recentNetworks.length,
            recentNetworks,
            currentItem: null,
            anchorEl: null,
          });
        });
      });
    });
  }

  openNetwork(id, secret, newTab) {
    this.hidePopover();
    const url = `/document/${id}`;
    if (newTab) {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (newWindow)
        newWindow.opener = null;
    } else {
      location.href = url;
    }
  }

  clearRecentNetworks() {
    const { recentNetworks } = this.state;
    if (recentNetworks)
      this.controller.clearRecentNetworks(() => this.refresh());
  }

  async deleteCurrentNetwork() {
    const { currentItem } = this.state;
    if (currentItem)
      await this.deleteNetwork(currentItem.id, true);
  }

  async deleteNetwork(id, refresh) {
    // await fetch(`/api/document/${id}`, {
    //   method: 'DELETE',
    // }).then(() => {
      this.controller.removeRecentNetwork(id, () => {
        if (refresh)
          this.refresh();
      });
    // }).catch((err) => {
    //   console.log(err);
    // });
  }

  showPopover(event, currentItem) {
    event.stopPropagation();
    this.setState({
      anchorEl: event.currentTarget,
      currentItem
    });
  }

  hidePopover() {
    this.setState({
      currentItem: null,
      anchorEl: null,
    });
  }

  snackBarOps() {
    return {
      close: () => this.setState({ snackBarState: { open: false }}),
      showMessage: message => this.setState({ snackBarState: { open: true, closeable: true, autoHideDelay: 3000, message }}),
      showSpinner: message => this.setState({ snackBarState: { open: true, closeable: false, spinner: true, message }}),
    };
  }

  render() {
    const { loading, length, recentNetworks, anchorEl, confirm } = this.state;
    const { classes } = this.props;

    return (
      <>
        <Collapse in={length > 0} timeout={500}>
          <Paper variant="outlined" square className={classes.paper}>
            <Grid container direction="column" alignItems="stretch" alignContent="stretch" justifyContent="flex-start">
              <Grid item>
                <Box>
                  <Grid container alignItems='center' alignContent="center" justifyContent="space-between">
                    <Grid item>
                      <Typography variant="subtitle1" gutterBottom className={classes.title}>
                        Recent Networks ({ length }):
                      </Typography>
                    </Grid>
                    <Grid item>
                      <IconButton size="small" onClick={e => this.showPopover(e)}>
                        <MoreVertIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
              <Grid item className={classes.container}>
                <Box className={classes.imageList}>
                  { loading && length > 0 && _.times(length, (idx) =>
                    this.renderItem({}, idx)
                  )}
                  { !loading && recentNetworks && recentNetworks.map((obj, idx) =>
                    this.renderItem(obj, idx)
                  )}
                </Box>
              </Grid>
              { anchorEl && (
                this.renderPopover()
              )}
              { confirm && (
                this.renderConfirmationDialog()
              )}
            </Grid>
          </Paper>
        </Collapse>
        <Snackbar
          className={classes.snackBar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          open={this.state.snackBarState.open || false} 
          autoHideDuration={this.state.snackBarState.autoHideDelay || null} 
          onClose={() => this.setState({ snackBarState: { open: false }})} 
        >
          <SnackbarContent 
            className={classes.snackBarContent}
            message={<span>{this.state.snackBarState.message || ""}</span>}
            action={(() => {
              if (this.state.snackBarState.closeable) {
                return (
                  <IconButton size='small' onClick={() => this.setState({ snackBarState: { open: false }})}>
                    <CloseIcon />
                  </IconButton>
                );
              } else if(this.state.snackBarState.spinner) {
                return <CircularProgressIcon size={20}/>;
              }
            })()}
          />
        </Snackbar>
      </>
    );
  }

  renderItem(obj, idx) {
    const { classes } = this.props;

    const id = obj.id;
    const secret = obj.secret;
    const name = obj.name ? obj.name : DEF_NETWORK_NAME;
    const png = obj.thumbnail ? obj.thumbnail : EMPTY_PNG;
    const imgSrc = `data:image/png;base64,${png}`;
    const enabled = id != null;

    const onClick = () => this.openNetwork(id, secret);

    const tooltipText = () => {
      return <>
        <code>Last opened: { new Date(obj.opened).toLocaleString('en-US') }</code><br />
        <code>Created:&nbsp;&nbsp;&nbsp;&nbsp; { new Date(obj.created).toLocaleString('en-US') }</code>
      </>;
    };
    const lastOpenedText = () => {
      const date = new Date(obj.opened);
      let today = new Date();
      if (new Date(date).setHours(0,0,0,0) == today.setHours(0,0,0,0)) { // call setHours to take the time out of the comparison
          return date.toLocaleTimeString('en-US', { hour: "2-digit", minute: "2-digit" }); // Date equals today's date, so display only the time
      }
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
      <Paper
        key={idx}
        variant="outlined"
        className={id ? classes.paperItem : classes.paperItemSkeleton}
        {...(enabled && { onClick })}
      >
        <Grid container direction="column" alignItems="stretch" justifyContent="center">
          <Grid item>
            { enabled ? (
              <img src={imgSrc} className={classes.thumbnail} style={{ background: NETWORK_BACKGROUND }} />
            ) : (
              <Skeleton variant="rect" className={classes.thumbnail} />
            )}
          </Grid>
          <Grid item>
            <Grid
              container
              direction="column"
              alignItems="stretch"
              justifyContent="center"
              className={id ? classes.metadata : classes.metadataSkeleton}
            >
              <Grid item>
                { enabled ? (
                  <Tooltip title={name}>
                    <Typography variant="body2" className={classes.name}>
                      { name }
                    </Typography>
                  </Tooltip>
                ) : (
                  <Skeleton variant="text" height={24} />
                )}
              </Grid>
              <Grid item>
                { enabled ? (
                  <Grid container direction="row" alignItems='center' justifyContent="space-between">
                    <Grid item>
                      <Tooltip title={tooltipText()}>
                        <Typography variant="caption" className={classes.caption}>
                          { lastOpenedText() }
                        </Typography>
                      </Tooltip>
                    </Grid>
                    <Grid item>
                      <IconButton size="small" onClick={e => this.showPopover(e, obj)}>
                        <MoreVertIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                ) : (
                  <Skeleton variant="text" height={30} />
                )}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    );
  }

  renderPopover() {
    const { recentNetworks, currentItem, anchorEl } = this.state;

    const handleCopyLink = async () => {
      if (recentNetworks && recentNetworks.length > 0) {
        // Copy the links of all networks to the clipboard
        let text = '';
        recentNetworks.forEach((obj, idx) => {
          text += `${obj.name}\t${window.location.origin}/document/${obj.id}`;
          if (idx < recentNetworks.length - 1) {
            text += '\n';
          }
        });
        navigator.clipboard.writeText(text);
        // Close the popup
        this.setState({ anchorEl: null });
        // Show the snackbar
        this.snack.showMessage("Links copied to clipboard");
      }
    };
    const deleteIfConfirmed = (currentItem) => {
      this.setState({
        confirm: true,
        confirmTitle: 'Remove Network?',
        confirmText: `The network &quot;<b>${currentItem.name ? currentItem.name : DEF_NETWORK_NAME}</b>&quot; will be removed from the list.`,
        confirmLabel: 'Remove Network',
        confirmFn: this.deleteCurrentNetwork,
        anchorEl: null,
        snackBarState: { open: false },
      });
    };
    const clearListIfConfirmed = () => {
      this.setState({
        confirm: true,
        confirmTitle: 'Clear Recent Network List?',
        confirmText: `The list of recent networks will be cleared.`,
        confirmLabel: 'Clear List',
        confirmFn: this.clearRecentNetworks,
        anchorEl: null,
      });
    };

    return (
      <Popover
        id="menu-popover"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => this.hidePopover()}
      >
      {currentItem == null && (
        <MenuList>
          <MenuItem onClick={() => handleCopyLink()}>
            <ListItemIcon>
              <ShareIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Share..." />
          </MenuItem>
          <MenuItem onClick={() => clearListIfConfirmed()}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Clear List..." />
          </MenuItem>
        </MenuList>
      )}
      {currentItem && (
        <MenuList>
          <MenuItem onClick={() => deleteIfConfirmed(currentItem)}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Remove..." />
          </MenuItem>
          <MenuItem onClick={() => this.openNetwork(currentItem.id, currentItem.secret, true)}>
            <ListItemIcon>
              <OpenInNewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Open in New Tab" />
          </MenuItem>
        </MenuList>
      )}
      </Popover>
    );
  }

  renderConfirmationDialog() {
    const { confirm, confirmTitle, confirmText, confirmLabel, confirmFn } = this.state;

    const handleClose = () => {
      this.setState({
        confirm: false,
        confirmTitle: null,
        confirmText: null,
        confirmLabel: null,
        confirmFn: null,
        currentItem: null
      });
    };
    const handleOK = async () => {
      if (confirmFn) { await confirmFn(); }
      handleClose();
    };

    return (
      <Dialog
        open={confirm}
        onClose={handleClose}
      >
        <DialogTitle>{ confirmTitle }</DialogTitle>
        <DialogContent>
          <DialogContentText>{ confirmText }</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="primary" onClick={handleClose} >
            Cancel
          </Button>
          <Button variant="contained" color="primary" autoFocus onClick={handleOK}>
            { confirmLabel }
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

RecentNetworksList.propTypes = {
  recentNetworksController: PropTypes.instanceOf(RecentNetworksController).isRequired,
  classes: PropTypes.object.isRequired,
};

export default withStyles(useStyles)(RecentNetworksList);