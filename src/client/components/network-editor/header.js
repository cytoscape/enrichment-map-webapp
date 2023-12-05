import React, { useState, useEffect, Fragment } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { HEADER_HEIGHT, LEFT_DRAWER_WIDTH, MIN_DESKTOP_TOOLBAR_WIDTH } from '../defaults';
import useElementSize from '../../use-element-size';
import { NetworkEditorController } from './controller';
import TitleEditor from './title-editor';
import PopoverMenu from './popover-menu';

import { makeStyles } from '@material-ui/core/styles';

import { AppBar, Box, IconButton, Divider, Tooltip,  Toolbar } from '@material-ui/core';

import { AppLogoIcon } from '../svg-icons';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import MenuIcon from '@material-ui/icons/Menu';

//==[ Header ]========================================================================================================

const useHeaderStyles = makeStyles((theme) => ({
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
    [theme.breakpoints.down('sm')]: {
      paddingLeft: theme.spacing(0.5),
      paddingRight: theme.spacing(0.5),
    },
  },
  hide: {
    display: 'none',
  },
  optionsButton: {
    width: 41,
    height: 41,
  },
}));

export function Header({
  menuDef,
  controller,
  leftDrawerOpen,
  isMobile,
  isTablet,
  onOpenLeftDrawer,
  onOpenRightDrawer,
}) {
  const [ networkLoaded, setNetworkLoaded ] = useState(() => controller.isNetworkLoaded());
  const [ anchorEl, setAnchorEl ] = useState(null);
  const [ subMenu, setSubMenu ] = useState(null);
  const [ showMobileMenu, setShowMobileMenu ] = useState(false);
  const [ toolbarRef, { width: toolbarWidth }] = useElementSize();

  const classes = useHeaderStyles();

  useEffect(() => {
    const onNetworkLoaded = () => setNetworkLoaded(true);
    controller.bus.on('networkLoaded', onNetworkLoaded);
    return () => controller.bus.removeListener('networkLoaded', onNetworkLoaded);
  }, []);

  useEffect(() => {
    handleCloseSubMenu(); // close sub menu whenever the toolbar width changes
    setShowMobileMenu(toolbarWidth < MIN_DESKTOP_TOOLBAR_WIDTH);
  }, [toolbarWidth]);

  const handleOpenSubMenu = (event, subMenu) => {
    setAnchorEl(event.currentTarget);
    setSubMenu(subMenu);
  };
  const handleCloseSubMenu = () => {
    setAnchorEl(null);
    setSubMenu(null);
  };

  const shiftAppBar = leftDrawerOpen && !isMobile && !isTablet;

  return (
    <>
      <AppBar
        position="relative"
        color='default'
        className={clsx(classes.appBar, { [classes.appBarShift]: shiftAppBar })}
      >
        <Toolbar ref={toolbarRef} variant="dense" className={classes.toolbar}>
        {!leftDrawerOpen && (
          <ToolbarButton
            title="Genes"
            icon={<KeyboardArrowRightIcon fontSize="large" />}
            edge="start"
            onClick={() => onOpenLeftDrawer(!leftDrawerOpen)}
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
        {!showMobileMenu && menuDef.map(({title, icon, onClick, unrelated, isEnabled, subMenu }, idx) =>
          <Fragment key={idx}>
            <ToolbarButton
              title={title}
              icon={icon}
              disabled={!networkLoaded || (isEnabled && !isEnabled())}
              subMenu={subMenu}
              onClick={onClick}
              onOpenSubMenu={handleOpenSubMenu}
            />
            <ToolbarDivider classes={classes} unrelated={unrelated} />
          </Fragment>
        )}
        {showMobileMenu && (
          <ToolbarButton
            title="Options"
            icon={<MenuIcon />}
            className={classes.optionsButton}
            onClick={onOpenRightDrawer}
          />
        )}
        </Toolbar>
      </AppBar>
    {!showMobileMenu && anchorEl && subMenu && (
      <PopoverMenu
        open
        target={anchorEl}
        menu={subMenu}
        onClose={handleCloseSubMenu}
      />
    )}
    </>
  );
}
Header.propTypes = {
  menuDef: PropTypes.array.isRequired,
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  leftDrawerOpen: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  isTablet: PropTypes.bool.isRequired,
  onOpenLeftDrawer: PropTypes.func.isRequired,
  onOpenRightDrawer: PropTypes.func.isRequired,
};

//==[ ToolbarButton ]=================================================================================================

function ToolbarButton({ title, icon, color, className, disabled, subMenu, onClick, onOpenSubMenu }) {
  const handleClick = (evt) => {
    if (subMenu) {
      onOpenSubMenu?.(evt, subMenu);
    } else {
      onClick?.(evt);
    }
  };

  return (
    <Tooltip arrow placement="bottom" title={title}>
      <span> {/* span needed to prevent issues with tooltips on disabled buttons */}
        <IconButton
          disabled={disabled}
          component={disabled ? "div" : undefined} // To prevent error: 'Material-UI: You are providing a disabled `button` child to the Tooltip component.'
          size="small"
          color={color || 'inherit'}
          className={className}
          onClick={handleClick}
        >
          { icon }
        </IconButton>
      </span>
    </Tooltip>
  );
}
ToolbarButton.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired,
  color: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  subMenu: PropTypes.array,
  onClick: PropTypes.func,
  onOpenSubMenu: PropTypes.func,
};


const useToolbarDividerStyles = makeStyles((theme) => ({
  divider: {
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5),
    width: 0,
  },
  unrelatedDivider: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    width: 0,
  },
}));

function ToolbarDivider({ unrelated }) {
  const classes = useToolbarDividerStyles();

  return <Divider orientation="vertical" flexItem variant="middle" className={unrelated ? classes.unrelatedDivider : classes.divider} />;
}
ToolbarDivider.propTypes = {
  unrelated: PropTypes.bool
};

export default Header;