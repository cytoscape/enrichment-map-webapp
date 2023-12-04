import React, { useEffect, useState, forwardRef } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import Mousetrap from 'mousetrap';
import chroma from 'chroma-js';

import { makeStyles } from '@material-ui/core/styles';

import { DEFAULT_PADDING, HEADER_HEIGHT, LEFT_DRAWER_WIDTH, BOTTOM_DRAWER_HEIGHT, bottomDrawerHeight } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import { Header } from './header';
import LeftDrawer from './left-drawer';
import RightDrawer from './right-drawer';
import BottomDrawer from './bottom-drawer';
import PopoverMenu from './popover-menu';
import { TYPE as UNDO_TYPE } from './undo-stack';
import { delay } from './util';

import { Button, IconButton, Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core';
import { Paper, List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import { Snackbar, SnackbarContent } from '@material-ui/core';
import Slide from '@material-ui/core/Slide';

import CloseIcon from '@material-ui/icons/Close';
import DoneIcon from '@material-ui/icons/Done';
import CircularProgressIcon from '@material-ui/core/CircularProgress';
import FitScreenIcon from '@material-ui/icons/SettingsOverscan';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import UndoIcon from '@material-ui/icons/Undo';
import DeleteIcon from '@material-ui/icons/Delete';
import RestoreIcon from '@material-ui/icons/SettingsBackupRestore';
import LinkIcon from '@material-ui/icons/Link';
import InsertDriveFileOutlinedIcon from '@material-ui/icons/InsertDriveFileOutlined';
import KeyboardReturnIcon from '@material-ui/icons/KeyboardReturn';


const SHARE_MENU_ID  = "menu-share";


const useStyles = makeStyles((theme) => ({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: HEADER_HEIGHT,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    background: '#fff',
  },
  cy: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    background: 'inherit',
    height: `calc(100% - ${BOTTOM_DRAWER_HEIGHT}px)`,
    transition: theme.transitions.create(['margin', 'width', 'height'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  cyShiftX: {
    width: `calc(100% - ${LEFT_DRAWER_WIDTH}px)`,
    marginLeft: LEFT_DRAWER_WIDTH,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  snackBar: {
    top: '70px',
    zOrder: 1000,
  },
  snackBarContent: {
    color: 'inherit',
    background: chroma(theme.palette.background.default).alpha(0.75).hex(),
    backdropFilter: 'blur(6px)',
  },
}));


const NetworkBackground = ({ controller }) => {
  const [ bgColor, setBgColor ] = useState('white');

  const busProxy = new EventEmitterProxy(controller.bus);

  useEffect(() => {
    busProxy.on('setNetworkBackgroundColor', (color) => setBgColor(color));

    return function cleanup() {
      busProxy.removeAllListeners();
    };
  }, []);
  
  return (
    <div style={{ position: 'absolute', zIndex: -1, width: '100%', height: '100%', backgroundColor: bgColor }} />
  );
};
NetworkBackground.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
};

const useRestoreConfirmDialogStyles = makeStyles((theme) => ({
  infoBox: {
    width: '100%',
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
    paddingLeft: 0,
    paddingRight: 0,
    border: 'unset',
  },
  item: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  itemIcon: {
    minWidth: 'unset',
    alignSelf: 'self-start',
    paddingTop: '0.25em',
  },
  itemIconIcon: {
    transform: 'scaleX(-1)',
    fontSize: '1em',
    marginRight: theme.spacing(1),
    color: theme.palette.text.secondary,
    opacity: 0.5,
  },
  itemText: {
    margin: 0,
    color: theme.palette.text.secondary,
  },
}));

const DownSlideTransition = forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});

function RestoreConfirmDialog({ open, isMobile, onOk, onCancel }) {
  const classes = useRestoreConfirmDialogStyles();

  return (
    <Dialog
      maxWidth="xs"
      open={open}
      fullScreen={isMobile}
      TransitionComponent={isMobile ? DownSlideTransition : undefined}
    >
      <DialogTitle>Confirm Restore Network Layout</DialogTitle>
      <DialogContent dividers>
        <p>Are you sure you want to restore the network layout to its initial state?</p>
        <Paper variant="outlined" className={classes.infoBox}>
        <List dense >
          <ListItem className={classes.item}>
            <ListItemIcon className={classes.itemIcon}>
              <KeyboardReturnIcon className={classes.itemIconIcon} />
            </ListItemIcon>
            <ListItemText className={classes.itemText} primary="All nodes will be returned to their initial positions." />
          </ListItem>
          <ListItem className={classes.item}>
            <ListItemIcon className={classes.itemIcon}>
              <KeyboardReturnIcon className={classes.itemIconIcon} />
            </ListItemIcon>
            <ListItemText className={classes.itemText} primary="All deleted nodes will be restored." />
          </ListItem>
        </List>
      </Paper>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="primary" startIcon={<CloseIcon />} autoFocus onClick={onCancel}>Cancel</Button>
        <Button variant="contained" color="primary" startIcon={<DoneIcon />} onClick={onOk}>Ok</Button>
      </DialogActions>
    </Dialog>
  );
}
RestoreConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool,
  onOk: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};


function getUndoMenuTitle(undoType) {
  switch(undoType) {
    case UNDO_TYPE.DELETE: return "Undo Delete";
    case UNDO_TYPE.POSITION: return "Undo Move";
    default: return "Undo";
  }
}

function createPanner({ cy }) {
  const zoomButtonFactor = 1.5;
  const panFactor = 100;
  const easing = 'ease-out';
  const duration = 400;

  const zoomByFactor = (factor) => {
    const container = cy.container();
    const x = container.clientWidth / 2;
    const y = container.clientHeight / 2;
    const zoom = cy.zoom() * factor;
    cy.stop().animate({
      zoom: {
        level: zoom,
        renderedPosition: { x, y }
      },
      easing,
      duration,
    });
  };

  const panBy = (x, y) => {
    const z = 1;
    cy.stop().animate({
      panBy: { x: x * z, y: y * z },
      easing,
      duration,
    });
  };

  const fit = () => {
    cy.stop().animate({
      fit: { padding: DEFAULT_PADDING },
      easing,
      duration,
    });
  };

  return {
    panLeft:  () => panBy(panFactor, 0),
    panRight: () => panBy(-panFactor, 0),
    panUp:    () => panBy(0, panFactor),
    panDown:  () => panBy(0, -panFactor),
    zoomOut:  () => zoomByFactor(1 / zoomButtonFactor),
    zoomIn:   () => zoomByFactor(zoomButtonFactor),
    fit:      () => fit(),
  };
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

const Main = ({
  controller,
  openLeftDrawer,
  openRightDrawer,
  openBottomDrawer,
  isMobile,
  isTablet,
  onContentClick,
  onCloseLeftDrawer,
  onCloseRightDrawer,
  onOpenLeftDrawer,
  onOpenRightDrawer,
  onToggleBottomDrawer
}) => {
  const [ menuName, setMenuName ] = useState(null);
  const [ anchorEl, setAnchorEl ] = useState(null);
  const [ confirmDialogOpen, setConfirmDialogOpen ] = useState(false);
  const [ undoEnabled, setUndoEnabled ] = useState(false);
  const [ undoType, setUndoType] = useState(null);
  const [ panner ] = useState(() => createPanner(controller));
  const [ imageExportEnabled, setImageExportEnabled ] = useState(true);
  const [ dataExportEnabled, setDataExportEnabled ] = useState(true);
  const [ snackBarState, setSnackBarState ] = useState({
    open: false,
    message: "",
    autoHideDelay: 4000,
    closeable: true,
    spinner: false
  });

  const classes = useStyles();

  const snack = snackBarOps(setSnackBarState);

  const shiftXCy = openLeftDrawer && !isMobile && !isTablet;
  const shiftYCy = openBottomDrawer;

  const showShareMenu = (event) => {
    setMenuName(SHARE_MENU_ID);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuName(null);
    setAnchorEl(null);
  };

  const handleNetworkRestore = () => {
    setConfirmDialogOpen(true);
  };
  const onConfirmCancel = () => {
    setConfirmDialogOpen(false);
  };
  const onConfirmOk = () => {
    controller.restoreNetwork(); // causes page reload, no need to set state
  };

  // Share/Download functions
  const handleCopyLink = async () => {
    handleMenuClose();
    await handleCopyToClipboard(); 
    snack.showMessage("Link copied to clipboard");
  };

  const handleExportImages = async () => {
    handleMenuClose();
    setImageExportEnabled(false);
    snack.showSpinner("Preparing network images...");
    await delay(50); // allows the menu to close immediately, otherwise it hangs for a couple seconds
    await controller.exportImageArchive(controller);
    snack.close();
    setImageExportEnabled(true); 
  };

  const handleExportData = async () => {
    handleMenuClose();
    setDataExportEnabled(false);
    const promise = controller.exportDataArchive(controller);
    await spinnerUntilDone(promise, "Preparing enrichment data...");
    setDataExportEnabled(true);
  };

  const spinnerUntilDone = async (promise, message) => {
    // Only show spinner if it takes longer than the delay
    const value = await Promise.race([ promise, delay(500) ]);
    if (value === 'delay') {
      // if the delay promise finished first
      snack.showSpinner(message);
    }
    await promise; // wait for the export to finish if it hasn't already
    snack.close();
  };

  // Definitons for the toolbar (or mobile menu drawer)
  const shareMenuDef = [
    {
      title: "Share Link to Network",
      icon: <LinkIcon />,
      onClick: handleCopyLink,
    }, {
      title: "Download Network Images",
      icon: <InsertDriveFileOutlinedIcon />,
      disabled: !imageExportEnabled,
      onClick: handleExportImages,
    }, {
      title: "Download Enrichment Data",
      icon: <InsertDriveFileOutlinedIcon />,
      disabled: !dataExportEnabled,
      onClick: handleExportData,
    }
  ];

  const menuDef = [ 
    {
      title: getUndoMenuTitle(undoType),
      icon: <UndoIcon />,
      onClick: () => controller.undoHandler.undo(),
      isEnabled: () => undoEnabled,
    },
    {
      title: "Delete Selected Nodes",
      icon: <DeleteIcon />,
      onClick: () => controller.deleteSelectedNodes(),
    }, {
      title: "Restore Network to Initial Layout",
      icon: <RestoreIcon />,
      onClick: handleNetworkRestore,
      unrelated: true,
    }, {
      title: "Zoom In",
      icon: <AddIcon />,
      onClick: panner.zoomIn,
    }, {
      title: "Zoom Out",
      icon: <RemoveIcon />,
      onClick: panner.zoomOut,
    }, {
      title: "Fit Figure to Screen",
      icon: <FitScreenIcon />,
      onClick: panner.fit,
      unrelated: true,
    }, {
      title: "Share/Download",
      icon: <CloudDownloadIcon />,
      onClick: showShareMenu,
      subMenu: shareMenuDef,
    },
  ];

  useEffect(() => {
    const onUndo = (pushOrPop, type, empty, peekType) => {
      setUndoEnabled(!empty);
      setUndoType(peekType);
    };
    controller.bus.on('undo', onUndo);
    return () => controller.bus.removeListener('undo', onUndo);
  }, []);

  useEffect(() => {
    Mousetrap
      .bind(['-','_'], panner.zoomOut)
      .bind(['=','+'], panner.zoomIn)
      .bind('up', panner.panUp)
      .bind('down', panner.panDown)
      .bind('left', panner.panLeft)
      .bind('right', panner.panRight)
      .bind(['f', 'space'], panner.fit) 
      .bind(['backspace','del'], () => controller.deleteSelectedNodes());
  
    return () => Mousetrap.unbind(['-','_','=','+','up','down','left','right','f','space','backspace','del']);
  }, [panner]);

  return (
    <>
      <Header
        menuDef={menuDef}
        controller={controller}
        leftDrawerOpen={openLeftDrawer}
        isMobile={isMobile}
        isTablet={isTablet}
        onOpenLeftDrawer={onOpenLeftDrawer}
        onOpenRightDrawer={onOpenRightDrawer}
      />
      <div className={classes.root} onClick={onContentClick}>
        <LeftDrawer
          open={openLeftDrawer}
          isMobile={isMobile}
          isTablet={isTablet}
          controller={controller}
          onClose={onCloseLeftDrawer}
        />
        <div className={classes.background}>
          <div
            className={clsx(classes.cy, { [classes.cyShiftX]: shiftXCy })}
            style={shiftYCy ? {height: `calc(100% - ${bottomDrawerHeight()}px)`,} : {}}
          >
            <div id="cy" className={classes.cy} style={{ zIndex: 1, width: '100%', height: '100%' }} />
            <NetworkBackground controller={controller} />
          </div>
          <RightDrawer
            open={openRightDrawer}
            menu={menuDef}
            onClose={onCloseRightDrawer}
          />
        </div>
        <BottomDrawer
          open={openBottomDrawer}
          isMobile={isMobile}
          isTablet={isTablet}
          leftDrawerOpen={openLeftDrawer}
          onToggle={onToggleBottomDrawer}
          controller={controller}
        />
      </div>
    {!isMobile && anchorEl && (
      <PopoverMenu
        open={menuName === SHARE_MENU_ID}
        target={anchorEl}
        menu={shareMenuDef}
        onClose={handleMenuClose}
      />
    )}
      <RestoreConfirmDialog 
        open={confirmDialogOpen} 
        isMobile={isMobile}
        onOk={onConfirmOk} 
        onCancel={onConfirmCancel} 
      />
      <Snackbar
        className={classes.snackBar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={snackBarState.open || false} 
        autoHideDuration={snackBarState.autoHideDelay || null} 
        onClose={() => setSnackBarState({ open: false })} 
      >
        <SnackbarContent 
          className={classes.snackBarContent}
          message={<span>{snackBarState.message || ""}</span>}
          action={(() => {
            if(snackBarState.closeable) {
              return (
                <IconButton size='small' onClick={() => setSnackBarState({ open: false })}>
                  <CloseIcon />
                </IconButton>
              );
            } else if(snackBarState.spinner) {
              return <CircularProgressIcon size={20}/>;
            }
          })()}
        />
      </Snackbar>
    </>
  );
};
Main.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  openLeftDrawer: PropTypes.bool.isRequired,
  openRightDrawer: PropTypes.bool.isRequired,
  openBottomDrawer: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  isTablet: PropTypes.bool.isRequired,
  onContentClick: PropTypes.func.isRequired,
  onCloseLeftDrawer: PropTypes.func.isRequired,
  onCloseRightDrawer: PropTypes.func.isRequired,
  onOpenLeftDrawer: PropTypes.func.isRequired,
  onOpenRightDrawer: PropTypes.func.isRequired,
  onToggleBottomDrawer: PropTypes.func,
};

export default Main;