import React, { useState, useEffect, Fragment } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import Mousetrap from 'mousetrap';

import { DEFAULT_PADDING, HEADER_HEIGHT, LEFT_DRAWER_WIDTH } from '../defaults';
import { NetworkEditorController } from './controller';
import TitleEditor from './title-editor';
import { ShareMenu } from './share-panel';
import { TYPE as UNDO_TYPE } from './undo-stack';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Button, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, SnackbarContent, Toolbar } from '@material-ui/core';
import { Divider } from '@material-ui/core';
import { Menu, MenuItem} from "@material-ui/core";
import { Tooltip } from '@material-ui/core';
import { IconButton, Box } from '@material-ui/core';

import { AppLogoIcon } from '../svg-icons';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import FitScreenIcon from '@material-ui/icons/SettingsOverscan';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import MenuIcon from '@material-ui/icons/Menu';
import { Add, Remove } from '@material-ui/icons';
import { Undo } from '@material-ui/icons';
import { Delete } from '@material-ui/icons';
import { SettingsBackupRestore } from '@material-ui/icons';
import CloseIcon from '@material-ui/icons/Close';
import CircularProgressIcon from '@material-ui/core/CircularProgress';


const MOBILE_MENU_ID = "menu-mobile";
const SHARE_MENU_ID  = "menu-share";


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


function getUndoButtonTitle(undoType) {
  switch(undoType) {
    case UNDO_TYPE.DELETE: return "Undo Delete";
    case UNDO_TYPE.POSITION: return "Undo Move";
    default: return "Undo";
  }
}


export function Header({ controller, classes, openLeftDrawer, isMobile, onOpenLeftDrawer }) {
  const [ menuName, setMenuName ] = useState(null);
  const [ mobileMoreAnchorEl, setMobileMoreAnchorEl ] = useState(null);
  const [ anchorEl, setAnchorEl ] = useState(null);
  const [ networkLoaded, setNetworkLoaded ] = useState(() => controller.isNetworkLoaded());
  const [ undoEnabled, setUndoEnabled ] = useState(false);
  const [ undoType, setUndoType] = useState(null);
  const [ confirmDialogOpen, setConfirmDialogOpen ] = useState(false);
  const [ panner ] = useState(() => createPanner(controller));

  const [ snackBarState, setSnackBarState ] = useState({
    open: false,
    message: "",
    autoHideDelay: 4000,
    closeable: true,
    spinner: false
  });

  useEffect(() => {
    const onNetworkLoaded = () => setNetworkLoaded(true);
    controller.bus.on('networkLoaded', onNetworkLoaded);
    return () => controller.bus.removeListener('networkLoaded', onNetworkLoaded);
  }, []);

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
  
  const handleMenuClose = () => {
    setMenuName(null);
    setMobileMoreAnchorEl(null);
    setAnchorEl(null);
  };

  const showMobileMenu = (event) => {
    setMobileMoreAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose= () => {
    setMobileMoreAnchorEl(null);
  };

  const showShareMenu = (event) => {
    setMenuName(SHARE_MENU_ID),
    setAnchorEl(event.currentTarget);
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

  const buttonsDef = [ 
    {
      title: getUndoButtonTitle(undoType),
      icon: <Undo />,
      onClick: () => controller.undoHandler.undo(),
      isEnabled: () => undoEnabled,
      unrelated: false,
    }, {
      title: "Delete Selected Nodes",
      icon: <Delete />,
      onClick: () => controller.deleteSelectedNodes(),
      unrelated: false,
    }, {
      title: "Restore Network to Initial Layout",
      icon: <SettingsBackupRestore />,
      onClick: handleNetworkRestore,
      unrelated: true,
    }, {
      title: "Zoom In",
      icon: <Add />,
      onClick: panner.zoomIn,
      unrelated: false,
    }, {
      title: "Zoom Out",
      icon: <Remove />,
      onClick: panner.zoomOut,
      unrelated: false,
    }, {
      title: "Fit Figure to Screen",
      icon: <FitScreenIcon />,
      onClick: panner.fit,
      unrelated: true,
    }, {
      title: "Share/Download",
      icon: <CloudDownloadIcon />,
      onClick: showShareMenu,
      unrelated: false,
    },
  ];

  const shiftAppBar = openLeftDrawer && !isMobile;

  const MobileMenu = () => {
    const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);
    return (
      <Menu
        anchorEl={mobileMoreAnchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        id={MOBILE_MENU_ID}
        keepMounted
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={isMobileMenuOpen}
        onClose={handleMobileMenuClose}
      >
        { buttonsDef.map(({title, icon, onClick}, idx) =>
          <MenuItem key={idx} onClick={onClick}>
            <IconButton>{icon}</IconButton>
            <p>{title}</p>
          </MenuItem>
        )}
      </Menu>
    );
  };

  return <>
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
              <IconButton size='small' 
                onClick={() => setSnackBarState({ open: false })}>
                <CloseIcon />
              </IconButton>
            );
          } else if(snackBarState.spinner) {
            return <CircularProgressIcon size={20}/>;
          }
        })()}
      />
    </Snackbar>
    <RestoreConfirmDialog 
      open={confirmDialogOpen} 
      onOk={onConfirmOk} 
      onCancel={onConfirmCancel} 
    />
    <AppBar
      position="relative"
      color='default'
      className={clsx(classes.appBar, { [classes.appBarShift]: shiftAppBar })}
    >
      <Toolbar variant="dense" className={classes.toolbar}>
      {!openLeftDrawer && (
        <ToolbarButton
          title="Genes"
          icon={<KeyboardArrowRightIcon fontSize="large" />}
          edge="start"
          onClick={() => onOpenLeftDrawer(!openLeftDrawer)}
        />
      )}
        <Box component="div" sx={{ display: { xs: 'none', sm: 'inline-block' }}}>
          <Tooltip arrow placement="bottom" title="Home">
            <IconButton 
              aria-label='home' 
              onClick={() => location.href = '/'}
            >
              <AppLogoIcon style={{ fontSize: 26 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <ToolbarDivider classes={classes} unrelated />
        <TitleEditor controller={controller} disabled={!networkLoaded} />
        <ToolbarDivider classes={classes} unrelated />
        <div className={classes.sectionDesktop}>
          { buttonsDef.map(({title, icon, onClick, unrelated, isEnabled }, idx) =>
            <Fragment key={idx}>
              <ToolbarButton
                title={title}
                icon={icon}
                disabled={!networkLoaded || (isEnabled && !isEnabled())}
                onClick={onClick}
              />
              <ToolbarDivider classes={classes} unrelated={unrelated} />
            </Fragment>
          )}
        </div>
        <div className={classes.sectionMobile}>
          <ToolbarButton
            title="Options"
            icon={<MenuIcon />}
            className={classes.optionsButton}
            onClick={showMobileMenu}
          />
        </div>
      </Toolbar>
      <MobileMenu />
      <ShareMenu
        visible={menuName === SHARE_MENU_ID}
        target={anchorEl}
        controller={controller}
        onClose={handleMenuClose}
        setSnackBarState={setSnackBarState}
      />
    </AppBar>
  </>;
}


function ToolbarButton({ title, icon, color, className, disabled, onClick }) {
  return (
    <Tooltip arrow placement="bottom" title={title}>
      <span> {/* span needed to prevent issues with tooltips on disabled buttons */}
        <IconButton
          disabled={disabled}
          component={disabled ? "div" : undefined} // To prevent error: 'Material-UI: You are providing a disabled `button` child to the Tooltip component.'
          size="small"
          color={color || 'inherit'}
          className={className}
          onClick={onClick}
        >
          { icon }
        </IconButton>
      </span>
    </Tooltip>
  );
}


function ToolbarDivider({ classes, unrelated }) {
  return <Divider orientation="vertical" flexItem variant="middle" className={unrelated ? classes.unrelatedDivider : classes.divider} />;
}

function RestoreConfirmDialog({ open, onOk, onCancel }) {
  return (
    <Dialog
      maxWidth="xs"
      open={open}
    >
      <DialogTitle>Confirm Restore Network Layout</DialogTitle>
      <DialogContent dividers>
        <p>Are you sure you want to restore the network layout to its initial state?</p>
        <p>All nodes will be returned to their initial positions. All deleted nodes will be restored.</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} autoFocus>Cancel</Button>
        <Button onClick={onOk}>Ok</Button>
      </DialogActions>
    </Dialog>
  );
}


const useStyles = theme => ({
  appBar: {
    minHeight: HEADER_HEIGHT,
    backgroundColor: theme.palette.background.default,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    width: `calc(100% - ${LEFT_DRAWER_WIDTH}px)`,
    marginLeft: LEFT_DRAWER_WIDTH,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  toolbar: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
  hide: {
    display: 'none',
  },
  divider: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    width: 0,
  },
  unrelatedDivider: {
    marginLeft: theme.spacing(3),
    marginRight: theme.spacing(3),
    width: 0,
  },
  sectionDesktop: {
    display: 'none',
    [theme.breakpoints.up('sm')]: {
      display: 'flex',
    },
  },
  sectionMobile: {
    display: 'flex',
    [theme.breakpoints.up('sm')]: {
      display: 'none',
    },
  },
  snackBar: {
    top: '70px',
    zOrder: 1000,
  },
  snackBarContent: {
    color: 'inherit',
    backgroundColor: 'rgb(33 33 33 / 80%)'
  },
  optionsButton: {
    width: 41,
    height: 41,
  },
});

ToolbarButton.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired,
  color: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

ToolbarDivider.propTypes = {
  classes: PropTypes.object.isRequired,
  unrelated: PropTypes.bool
};

Header.propTypes = {
  classes: PropTypes.object.isRequired,
  controller: PropTypes.instanceOf(NetworkEditorController),
  openLeftDrawer: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  onOpenLeftDrawer: PropTypes.func.isRequired,
};

RestoreConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOk: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default withStyles(useStyles)(Header);