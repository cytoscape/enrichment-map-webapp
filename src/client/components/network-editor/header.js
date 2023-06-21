import React, { useState, useEffect, Fragment } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import Mousetrap from 'mousetrap';

import { DEFAULT_PADDING, CONTROL_PANEL_WIDTH } from '../defaults';
import { NetworkEditorController } from './controller';
import TitleEditor from './title-editor';
import { ShareMenu } from './share-panel';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Snackbar, SnackbarContent, Toolbar } from '@material-ui/core';
import { Divider } from '@material-ui/core';
import { Popover, Menu, MenuItem} from "@material-ui/core";
import { Tooltip } from '@material-ui/core';
import { IconButton, Box } from '@material-ui/core';

import { AppLogoIcon } from '../svg-icons';
import MenuIcon from '@material-ui/icons/Menu';
import FitScreenIcon from '@material-ui/icons/SettingsOverscan';
import ReplyIcon from '@material-ui/icons/Reply';
import MoreIcon from '@material-ui/icons/MoreVert';
import RotateLeftIcon from '@material-ui/icons/RotateLeft';
import BubbleChartIcon from '@material-ui/icons/BubbleChart';
import { Add, Remove } from '@material-ui/icons';
import CloseIcon from '@material-ui/icons/Close';

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

let layoutDisabled = false;

export function Header({ controller, classes, showControlPanel, isMobile, onShowControlPanel }) {

  const [ menuName, setMenuName ] = useState(null);
  const [ mobileMoreAnchorEl, setMobileMoreAnchorEl ] = useState(null);
  const [ anchorEl, setAnchorEl ] = useState(null);
  const [ networkLoaded, setNetworkLoaded ] = useState(() => controller.isNetworkLoaded());
  const [ snackOpen, setSnackOpen ] = useState(false);
  const [ snackMessage, setSnackMessage ] = useState('');
  const [ layoutSorted, setLayoutSorted ] = useState(true);

  const panner = createPanner(controller);

  useEffect(() => {
    const onNetworkLoaded = () => setNetworkLoaded(true);
    controller.bus.on('networkLoaded', onNetworkLoaded);
    return () => controller.bus.removeListener('networkLoaded', onNetworkLoaded);
  }, []);

  useEffect(() => {
    Mousetrap.bind('-', panner.zoomOut);
    Mousetrap.bind('_', panner.zoomOut);
    Mousetrap.bind('=', panner.zoomIn);
    Mousetrap.bind('+', panner.zoomIn);
    Mousetrap.bind('up', panner.panUp);
    Mousetrap.bind('down', panner.panDown);
    Mousetrap.bind('left', panner.panLeft);
    Mousetrap.bind('right', panner.panRight);
    Mousetrap.bind('f', panner.fit);
    Mousetrap.bind('space', panner.fit);
  
    return () => {
      Mousetrap.unbind('-');
      Mousetrap.unbind('_');
      Mousetrap.unbind('=');
      Mousetrap.unbind('+');
      Mousetrap.unbind('up');
      Mousetrap.unbind('down');
      Mousetrap.unbind('left');
      Mousetrap.unbind('right');
      Mousetrap.unbind('f');
      Mousetrap.unbind('space');
    };
  }, []);
  
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

  const showSnackbar = (open, message='') => {
    setSnackOpen(open);
    setSnackMessage(message);
  };

  const runLayout = async () => {
    if(layoutDisabled)
      return;
    layoutDisabled = true;
    if(layoutSorted) {
      controller.positions = controller.getNodePositions();
      await controller.applyLayout({ name: 'sorted' });
    } else {
      await controller.applyLayout({ name: 'preset', positions: controller.positions });
    }
    setLayoutSorted(!layoutSorted);
    layoutDisabled = false;
  };

  const buttonsDef = [ 
    {
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
      title: layoutSorted ? "Sort by Significance" : "Sort by Similarity",
      icon:  layoutSorted ? <RotateLeftIcon /> : <BubbleChartIcon />,
      onClick: runLayout,
      unrelated: true,
    }, {
      title: "Share",
      icon: <ReplyIcon style={{transform: 'scaleX(-1)'}} />,
      onClick: showShareMenu,
      unrelated: false,
    }
  ];

  const shiftAppBar = showControlPanel && !isMobile;

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
      open={snackOpen} 
      autoHideDuration={4000} 
      onClose={() => showSnackbar(false)} 
    >
      <SnackbarContent 
        className={classes.snackBarContent}
        message={<span>{snackMessage}</span>}
        action={
          <IconButton size='small' onClick={() => showSnackbar(false)}>
            <CloseIcon />
          </IconButton>
        }
      />
    </Snackbar>
    <AppBar
      position="relative"
      color='default'
      className={clsx(classes.appBar, { [classes.appBarShift]: shiftAppBar })}
    >
      <Toolbar variant="dense">
        <ToolbarButton
          title="Control Panel"
          icon={<MenuIcon />}
          edge="start"
          onClick={() => onShowControlPanel(!showControlPanel)}
        />
        <Box component="div" sx={{ display: { xs: 'none', sm: 'inline-block' }}}>
          <Tooltip arrow placement="bottom" title="Home">
            <IconButton 
              aria-label='close' 
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
          { buttonsDef.map(({title, icon, onClick, unrelated}, idx) =>
            <Fragment key={idx}>
              <ToolbarButton
                title={title}
                icon={icon}
                disabled={!networkLoaded}
                onClick={onClick}
              />
              <ToolbarDivider classes={classes} unrelated={unrelated} />
            </Fragment>
          )}
        </div>
        <div className={classes.sectionMobile}>
          <ToolbarButton
            title="Options"
            icon={<MoreIcon />}
            onClick={showMobileMenu}
          />
        </div>
      </Toolbar>
      <MobileMenu />
      {anchorEl && (
        <Popover
          id="menu-popover"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          onClose={handleMenuClose}
        >
          {menuName === SHARE_MENU_ID && (
            <ShareMenu 
              controller={controller} 
              onClose={handleMenuClose}
              showMessage={message => showSnackbar(true, message)}
            />
          )}
        </Popover>
      )}
    </AppBar>
  </>;
}


function ToolbarButton({ title, icon, color, className, disabled, onClick }) {
  return (
    <Tooltip arrow placement="bottom" title={title}>
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
    </Tooltip>
  );
}


function ToolbarDivider({ classes, unrelated }) {
  return <Divider orientation="vertical" flexItem variant="middle" className={unrelated ? classes.unrelatedDivider : classes.divider} />;
}


const useStyles = theme => ({
  appBar: {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    width: `calc(100% - ${CONTROL_PANEL_WIDTH}px)`,
    marginLeft: CONTROL_PANEL_WIDTH,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
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
  }
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
  showControlPanel: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  onShowControlPanel: PropTypes.func.isRequired,
};

export default withStyles(useStyles)(Header);