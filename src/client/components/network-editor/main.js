import React, { useEffect, useState, forwardRef } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import Mousetrap from 'mousetrap';

import { useTheme } from '@mui/material/styles';

import makeStyles from '@mui/styles/makeStyles';

import { DEFAULT_PADDING, HEADER_HEIGHT, LEFT_DRAWER_WIDTH, BOTTOM_DRAWER_HEIGHT, bottomDrawerHeight } from '../defaults';
import { NetworkEditorController } from './controller';
import { Header } from './header';
import LeftDrawer from './left-drawer';
import RightDrawer from './right-drawer';
import BottomDrawer from './bottom-drawer';
import { TYPE as UNDO_TYPE } from './undo-stack';

import { Button, IconButton, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Snackbar, SnackbarContent } from '@mui/material';
import Slide from '@mui/material/Slide';

import CloseIcon from '@mui/icons-material/Close';
import DoneIcon from '@mui/icons-material/Done';
import CircularProgressIcon from '@mui/material/CircularProgress';
import FitScreenIcon from '@mui/icons-material/SettingsOverscan';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import UndoIcon from '@mui/icons-material/Undo';
import RestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import { DragSelectIcon, DownloadIcon, ShareIcon } from '../svg-icons';


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
    background: theme.palette.background.network,
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
}));


const useRestoreConfirmDialogStyles = makeStyles((theme) => ({
  root: {
    // Disable Text Selection:
    WebkitTouchCallout: 'none', /* iOS Safari */
    WebkitUserSelect: 'none', /* Safari */
    MozUserSelect: 'none', /* Firefox */
    msUserSelect: 'none', /* Internet Explorer/Edge */
    userSelect: 'none', /* Non-prefixed version (Chrome and Opera) */
    // -----------------------
  },
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
      className={classes.root}
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
          {/* <ListItem className={classes.item}>
            <ListItemIcon className={classes.itemIcon}>
              <KeyboardReturnIcon className={classes.itemIconIcon} />
            </ListItemIcon>
            <ListItemText className={classes.itemText} primary="All deleted nodes will be restored." />
          </ListItem> */}
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
    showMessage: message => setSnackBarState({ open: true, closeable: true, autoHideDelay: 3000, severity: 'success', message }),
    showSpinner: message => setSnackBarState({ open: true, closeable: false, spinner: true, severity: 'info', message }),
  };
}

const Main = ({
  controller,
  openLeftDrawer,
  openRightDrawer,
  openBottomDrawer,
  isMobile,
  isTablet,
  onCloseLeftDrawer,
  onCloseRightDrawer,
  onOpenLeftDrawer,
  onOpenRightDrawer,
  onToggleBottomDrawer
}) => {
  const [ confirmDialogOpen, setConfirmDialogOpen ] = useState(false);
  const [ undoEnabled, setUndoEnabled ] = useState(false);
  const [ undoType, setUndoType] = useState(null);
  const [ panner ] = useState(() => createPanner(controller));
  const [ exportEnabled, setExportEnabled ] = useState(true);
  const [ snackBarState, setSnackBarState ] = useState({
    open: false,
    message: "",
    autoHideDelay: 4000,
    closeable: true,
    spinner: false,
  });

  const classes = useStyles();
  const theme = useTheme();

  const cy = controller.cy;
  const snack = snackBarOps(setSnackBarState);

  const shiftXCy = openLeftDrawer && !isMobile && !isTablet;
  const shiftYCy = openBottomDrawer;

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
    handleCopyToClipboard();
    snack.showMessage("Link copied to clipboard");
  };

  const handleExport = async () => {
    setExportEnabled(false);
    snack.showSpinner("Preparing enrichment data and network images...");
    await controller.exportController.exportArchive();
    snack.close();
    setExportEnabled(true);
  };

  const menuDef = [ 
    {
      title: "Zoom to Fit",
      icon: <FitScreenIcon />,
      onClick: panner.fit,
    }, {
      title: "Zoom In",
      icon: <AddIcon />,
      onClick: panner.zoomIn,
    }, {
      title: "Zoom Out",
      icon: <RemoveIcon />,
      onClick: panner.zoomOut,
      unrelated: true,
    }, {
      title: "Enable Drag-to-Select",
      description: "(or use SHIFT-select)",
      icon: <DragSelectIcon />,
      onClick: ()=> cy.userPanningEnabled(!cy.userPanningEnabled()),
      isSelected: () => !cy.userPanningEnabled(),
      alwaysShow: true, // always show on desktop/tablet, but still hides on mobile
      unrelated: true,
    }, {
      title: getUndoMenuTitle(undoType),
      icon: <UndoIcon />,
      onClick: () => controller.undoHandler.undo(),
      isEnabled: () => undoEnabled,
    },
    // {
    //   title: "Delete Selected Nodes",
    //   icon: <DeleteIcon />,
    //   onClick: () => controller.deleteSelectedNodes(),
    // },
    {
      title: "Restore Network Layout",
      icon: <RestoreIcon />,
      onClick: handleNetworkRestore,
      unrelated: true,
    }, {
      title: "Download Data and Images",
      icon: <DownloadIcon />,
      onClick: handleExport,
      isEnabled: () => exportEnabled,
      alwaysShow: true, // always show on desktop/tablet, but still hides on mobile
    }, {
      title: "Share",
      icon: <ShareIcon />,
      onClick: handleCopyLink,
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
      // .bind(['backspace','del'], () => controller.deleteSelectedNodes())
    ;
  
    return () => Mousetrap.unbind(['-','_','=','+','up','down','left','right','f','space'/**,'backspace','del'*/]);
  }, [panner]);

  const rightMenuDef = isMobile ? menuDef : menuDef.filter(el => !el.alwaysShow);

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
      <div className={classes.root}>
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
            style={shiftYCy ? {height: `calc(100% - ${bottomDrawerHeight(theme)}px)`,} : {}}
          >
            <div id="cy" className={classes.cy} style={{ zIndex: 1, width: '100%', height: '100%' }} />
          </div>
          <RightDrawer
            open={openRightDrawer}
            menu={rightMenuDef}
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
          message={<span>{snackBarState.message || ""}</span>}
          action={(() => {
            if (snackBarState.closeable) {
              return (
                <IconButton size='small' color="inherit" onClick={() => setSnackBarState({ open: false })}>
                  <CloseIcon />
                </IconButton>
              );
            } else if (snackBarState.spinner) {
              return <CircularProgressIcon color="inherit" size={20}/>;
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
  onCloseLeftDrawer: PropTypes.func.isRequired,
  onCloseRightDrawer: PropTypes.func.isRequired,
  onOpenLeftDrawer: PropTypes.func.isRequired,
  onOpenRightDrawer: PropTypes.func.isRequired,
  onToggleBottomDrawer: PropTypes.func,
};

export default Main;