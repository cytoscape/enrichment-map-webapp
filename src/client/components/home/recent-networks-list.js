import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import clsx from 'clsx';

import { networkURL } from '../util';
import { RecentNetworksController } from '../recent-networks-controller';

import withStyles from '@mui/styles/withStyles';

import { Box, Paper, Grid } from '@mui/material';
import { Typography, Tooltip } from '@mui/material';
import { Popover, MenuList, MenuItem, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Button, IconButton } from '@mui/material';
import { Skeleton } from '@mui/material';
import { Snackbar, SnackbarContent } from '@mui/material';
import Collapse from '@mui/material/Collapse';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgressIcon from '@mui/material/CircularProgress';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import { ContentCopyIcon, ShareIcon } from '../svg-icons';


const DEF_NETWORK_NAME = 'Untitled Network';
/** Transparent 1 pixel PNG */
const EMPTY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';


const useStyles = theme => ({
  paper: {
    whiteSpace: 'nowrap',
    backgroundColor: theme.palette.background.default,
    border: 'none',
    borderRadius: '0 0 8px 8px',
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1, 2.75, 0, 2.75),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(0.5, 0.75, 0, 0.75),
    },
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'left',
  },
  container: {
    display: 'grid',
    overflow: 'hidden',
    justifyContent: 'left',
  },
  actionIcon: {
    color: theme.palette.text.primary,
  },
  imageList: {
    listStyle: 'none',
    overflowX: 'scroll',
    overflowY: 'auto',
    webkitOverflowScrolling: 'touch',
    transform: 'translateZ(0)', // Promote the list into his own layer on Chrome. This cost memory but helps keeping high FPS.
    minHeight: 238, // fixes height bug in Safari
    [theme.breakpoints.down('sm')]: {
      minHeight: 218, // fixes height bug in Safari
    },
  },
  paperItem: {
    display: 'inline-block',
    margin: theme.spacing(0.5),
    padding: theme.spacing(0.5),
    cursor: 'pointer',
    borderRadius: 8,
    backgroundColor: theme.palette.background.header,
    "&:hover": {
      backgroundColor: theme.palette.action.selected,
    }
  },
  paperItemSkeleton: {
    display: 'inline-block',
    margin: theme.spacing(0.5),
    padding: theme.spacing(0.5),
    cursor: 'default',
    borderRadius: 8,
    backgroundColor: theme.palette.background.header,
  },
  thumbnail: {
    width: 172,
    height: 148,
    objectFit: 'contain',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 4,
    backgroundColor: theme.palette.background.network,
    [theme.breakpoints.down('sm')]: {
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
    [theme.breakpoints.down('sm')]: {
      maxWidth: 132,
    },
  },
  caption: {
    color: theme.palette.text.secondary,
  },
  snackBar: {
    top: '10px',
    zOrder: 1000,
  },
  confirmInfoBox: {
    width: '100%',
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
    paddingLeft: 0,
    paddingRight: 0,
    border: 'unset',
  },
  confirmInfoItem: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  confirmInfoItemIcon: {
    minWidth: 'unset',
    alignSelf: 'self-start',
    marginTop: theme.spacing(0.5),
  },
  confirmInfoIcon: {
    transform: 'scaleX(-1)',
    fontSize: '1em',
    marginRight: theme.spacing(1),
    color: theme.palette.text.disabled,
    opacity: 0.5,
  },
  confirmInfoItemText: {
    margin: 0,
    color: theme.palette.text.secondary,
  },
  code: {
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(0.5),
    borderRadius: 2,
  }
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
      confirmContent: null, // Dialog text
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
          }, () => this.props.onRefresh());
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

  showPopover(event) {
    event.stopPropagation();
    this.setState({
      anchorEl: event.currentTarget,
      currentItem: null,
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
      showMessage: message => this.setState({ snackBarState: { open: true, closeable: true, autoHideDelay: 3000, severity: 'success', message }}),
      showSpinner: message => this.setState({ snackBarState: { open: true, closeable: false, spinner: true, severity: 'info', message }}),
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
                        <MoreVertIcon className={classes.actionIcon} />
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
            message={<span>{this.state.snackBarState.message || ""}</span>}
            action={(() => {
              if (this.state.snackBarState.closeable) {
                return (
                  <IconButton size='small' color="inherit" onClick={() => this.setState({ snackBarState: { open: false }})}>
                    <CloseIcon />
                  </IconButton>
                );
              } else if (this.state.snackBarState.spinner) {
                return <CircularProgressIcon color="inherit" size={20}/>;
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

    const handleCopyLink = async () => {
      navigator.clipboard.writeText(`${networkURL(id)}`);
      this.snack.showMessage("Link copied to clipboard");
    };

    const onClick = () => this.openNetwork(id, secret);
    const onDelete = (event) => {
      event.stopPropagation();
      this.setState({
        confirm: true,
        confirmTitle: 'Remove Network?',
        confirmContent:
          <>
            <p>The network <span style={{overflowWrap: 'break-word'}}><code className={classes.code}>{ name }</code></span> will be removed from the list.</p>
            <Paper variant="outlined" className={classes.confirmInfoBox}>
              <List dense>
                <ListItem className={classes.confirmInfoItem}>
                  <ListItemIcon className={classes.confirmInfoItemIcon}>
                    <KeyboardReturnIcon className={classes.confirmInfoIcon} />
                  </ListItemIcon>
                  <ListItemText
                    className={classes.confirmInfoItemText}
                    primary={
                      <>
                        You can still access this network with its <b>permanent link</b>&nbsp;
                        <Tooltip title="Copy link">
                          <IconButton size="small" onClick={handleCopyLink}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    }
                  />
                </ListItem>
              </List>
            </Paper>
          </>,
        confirmLabel: 'Remove Network',
        confirmFn: () => this.deleteNetwork(id, true),
        anchorEl: null,
        snackBarState: { open: false },
      });
    };

    const tooltipText = () => {
      return <>Last opened: { new Date(obj.opened).toLocaleString('en-US') }</>;
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
              <img src={imgSrc} className={classes.thumbnail} />
            ) : (
              <Skeleton variant="rectangular" className={classes.thumbnail} />
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
                      <IconButton size="small" onClick={e => onDelete(e)}>
                        <DeleteIcon fontSize="small" className={classes.actionIcon} />
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
    const { recentNetworks, anchorEl } = this.state;

    const { classes } = this.props;

    const handleCopyLinks = async () => {
      if (recentNetworks && recentNetworks.length > 0) {
        // Copy the links of all networks to the clipboard
        let text = '';
        recentNetworks.forEach((obj, idx) => {
          text += `${obj.name}\t${networkURL(obj.id)}`;
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
    
    const clearListIfConfirmed = () => {
      this.setState({
        confirm: true,
        confirmTitle: 'Clear Recent Network List?',
        confirmContent: <>The list of recent networks will be cleared.</>,
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
        <MenuList>
          <MenuItem onClick={() => handleCopyLinks()}>
            <ListItemIcon>
              <ShareIcon fontSize="small" className={classes.actionIcon} />
            </ListItemIcon>
            <ListItemText primary="Share" />
          </MenuItem>
          <MenuItem onClick={() => clearListIfConfirmed()}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" className={classes.actionIcon} />
            </ListItemIcon>
            <ListItemText primary="Clear List..." />
          </MenuItem>
        </MenuList>
      </Popover>
    );
  }

  renderConfirmationDialog() {
    const { confirm, confirmTitle, confirmContent, confirmLabel, confirmFn } = this.state;
    const { isMobile } = this.props;

    const handleClose = () => {
      this.setState({
        confirm: false,
        confirmTitle: null,
        confirmContent: null,
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
        fullScreen={isMobile}
        onClose={handleClose}
      >
        <DialogTitle>{ confirmTitle }</DialogTitle>
        <DialogContent dividers>
          { confirmContent }
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
  isMobile: PropTypes.bool,
  onRefresh: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
};

export default withStyles(useStyles)(RecentNetworksList);