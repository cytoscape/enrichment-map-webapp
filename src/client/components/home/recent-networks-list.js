import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { NETWORK_BACKGROUND } from '../defaults';
import { RecentNetworksController } from '../recent-networks-controller';

import { withStyles } from '@material-ui/core/styles';

import { Box, Paper, Grid } from '@material-ui/core';
import { Typography, Tooltip } from '@material-ui/core';
import { Popover, MenuList, MenuItem, ListItemIcon, ListItemText } from '@material-ui/core';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import { Button, IconButton } from '@material-ui/core';
import { Skeleton } from '@material-ui/lab';
import Collapse from '@material-ui/core/Collapse';

import MoreVertIcon from '@material-ui/icons/MoreVert';
import DeleteIcon from '@material-ui/icons/Delete';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';


const MAX_ITEMS = 20;
const DEF_NETWORK_NAME = 'Untitled Network';
/** Transparent 1 pixel PNG */
const EMPTY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';


const useStyles = theme => ({
  paper: {
    whiteSpace: 'nowrap',
    boxShadow: 'none',
    border: 'none',
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1, 2.75, 0, 2.75),
    [theme.breakpoints.down('xs')]: {
      padding: theme.spacing(0.5, 0.75, 0, 0.75),
    },
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
    padding: theme.spacing(0, 0, 1, 0),
    transform: 'translateZ(0)', // Promote the list into his own layer on Chrome. This cost memory but helps keeping high FPS.
  },
  paperItem: {
    display: 'inline-block',
    margin: theme.spacing(0.5),
    cursor: 'pointer',
  },
  paperItemSkeleton: {
    display: 'inline-block',
    margin: theme.spacing(0.5),
    cursor: 'default',
    border: '1px solid transparent',
  },
  thumbnail: {
    width: 172,
    height: 148,
    objectFit: 'contain',
    [theme.breakpoints.down('xs')]: {
      width: 148,
      height: 128,
    },
  },
  metadata: {
    textAlign: 'left',
    margin: 0,
    padding: theme.spacing(0.5, 0.25, 0.5, 1),
  },
  metadataSkeleton: {
    margin: 0,
    padding: '10px 2px 10px 2px',
  },
  subtitle1: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  body2: {
    maxWidth: 148,
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
    };

    this.clearRecentNetworks = this.clearRecentNetworks.bind(this);
    this.deleteCurrentNetwork = this.deleteCurrentNetwork.bind(this);
  }

  componentDidMount() {
    if (!this.state.recentNetworks)
      this.refresh();
  }

  refresh() {
    this.controller.getRecentNetworksLength((length) => {
      this.setState({
        loading: true,
        length: Math.min(length, MAX_ITEMS),
        currentItem: null,
        anchorEl: null,
      }, () => {
        this.controller.getRecentNetworks((val) => {
          const recentNetworks = val.slice(0, MAX_ITEMS);
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

  render() {
    const { loading, length, recentNetworks, anchorEl, confirm } = this.state;
    const { classes } = this.props;

    return (
      <Collapse in={length > 0} timeout={500}>
        <Paper variant="outlined" square className={classes.paper}>
          <Grid container direction="column" alignItems="stretch" alignContent="stretch" justifyContent="flex-start">
            <Grid item>
              <Box>
                <Grid container alignItems='center' alignContent="center" justifyContent="space-between">
                  <Grid item>
                    <Typography variant="subtitle1" gutterBottom className={classes.subtitle1}>
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
                    <Typography variant="body2" className={classes.body2}>
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
                      <Tooltip title={'Opened ' + new Date(obj.opened).toLocaleString('en-US')}>
                        <Typography variant="caption" className={classes.caption}>
                          { new Date(obj.opened).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }
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
    const { currentItem, anchorEl } = this.state;

    const deleteIfConfirmed = (currentItem) => {
      this.setState({
        confirm: true,
        confirmTitle: 'Remove Network?',
        confirmText: `The network &quot;<b>${currentItem.name ? currentItem.name : DEF_NETWORK_NAME}</b>&quot; will be removed from the list.`,
        confirmLabel: 'Remove Network',
        confirmFn: this.deleteCurrentNetwork,
        anchorEl: null,
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