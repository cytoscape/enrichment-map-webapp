import React, { useState, useEffect, Fragment } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import _ from 'lodash';

import { HEADER_HEIGHT, LEFT_DRAWER_WIDTH, MIN_DESKTOP_TOOLBAR_WIDTH } from '../defaults';
import useElementSize from '../../use-element-size';
import { NetworkEditorController } from './controller';
import TitleEditor from './title-editor';
import PopoverMenu from './popover-menu';

import makeStyles from '@mui/styles/makeStyles';

import { AppBar, Box, IconButton, Divider, Tooltip,  Toolbar } from '@mui/material';
import { ToggleButton } from '@mui/material';

import { AppLogoIcon } from '../svg-icons';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import MenuIcon from '@mui/icons-material/Menu';
import MoreIcon from '@mui/icons-material/MoreVert';

//==[ Header ]========================================================================================================

const useHeaderStyles = makeStyles((theme) => ({
  appBar: {
    minHeight: HEADER_HEIGHT,
    zIndex: theme.zIndex.drawer - 100,
    borderBottom: `1px solid ${theme.palette.divider}`,
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
    [theme.breakpoints.down('md')]: {
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
  const toolbarBtnDef = menuDef.filter(el => !showMobileMenu || (el.alwaysShow && !isMobile));

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
          <Box component="div">
            <Tooltip placement="bottom" title="Home">
              <IconButton aria-label='home' size="large" onClick={() => location.href = '/'}>
                <AppLogoIcon style={{ fontSize: 26 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <ToolbarDivider classes={classes} unrelated={!isMobile} />
          <TitleEditor controller={controller} disabled={!networkLoaded} />
          <ToolbarDivider classes={classes} unrelated={!isMobile} />
        {toolbarBtnDef.map(({title, icon, description, onClick, unrelated, isEnabled, isSelected, subMenu }, idx) =>
          <Fragment key={idx}>
            <ToolbarButton
              title={title}
              icon={icon}
              description={description}
              disabled={!networkLoaded || (isEnabled && !isEnabled())}
              selected={isSelected?.()}
              subMenu={subMenu}
              onClick={onClick}
              onOpenSubMenu={handleOpenSubMenu}
            />
            <ToolbarDivider classes={classes} unrelated={unrelated && !showMobileMenu} />
          </Fragment>
        )}
        {showMobileMenu && (
          <>
          {toolbarBtnDef.length > 0 && (
            <ToolbarDivider classes={classes} unrelated />
          )}
            <ToolbarButton
              title="Options"
              icon={toolbarBtnDef.length > 0 ? <MoreIcon /> : <MenuIcon />}
              className={classes.optionsButton}
              onClick={onOpenRightDrawer}
            />
          </>
        )}
        </Toolbar>
      </AppBar>
    {!showMobileMenu && anchorEl && subMenu && (
      <>
        <ToolbarDivider classes={classes} unrelated />
        <PopoverMenu
          open
          target={anchorEl}
          menu={subMenu}
          onClose={handleCloseSubMenu}
        />
      </>
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

const useToolbarButtonStyles = makeStyles((theme) => ({
  toggle: {
    border: 'none !important',
    color: 'inherit',
  },
}));

function ToolbarButton({ title, icon, description, color, className, disabled, selected:defaultSelected, subMenu, onClick, onOpenSubMenu }) {
  const [ selected, setSelected ] = React.useState(defaultSelected);
  const [ showTooltip, setShowTooltip ] = React.useState(false);

  const classes = useToolbarButtonStyles();
  
  const isToggleButton = defaultSelected != null;

  const handleClick = (evt) => {
    if (isToggleButton) {
      setSelected(!selected);
      onClick?.(evt);
    } else if (subMenu) {
      onOpenSubMenu?.(evt, subMenu);
    } else {
      onClick?.(evt);
    }
  };
  
  const tooltipText =
    <>
      <span style={{fontSize: '0.85rem'}}>{ title }</span>
      {!_.isEmpty(description) && (
        <><br />{ description }</>
      )}
    </>;

  return (
    <Tooltip
      title={tooltipText}
      disableHoverListener
      open={showTooltip && !disabled} 
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span> {/* span needed to prevent issues with tooltips on disabled buttons */}
      {isToggleButton ?
        <ToggleButton
          value="selected"
          disabled={disabled}
          selected={selected}
          size="small"
          color={color || 'standard'}
          className={clsx(classes.toggle, className)}
          onClick={handleClick}
        >
          { icon }
        </ToggleButton>
      :
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
      }
      </span>
    </Tooltip>
  );
}
ToolbarButton.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired,
  description: PropTypes.string,
  color: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  selected: PropTypes.bool,
  subMenu: PropTypes.array,
  onClick: PropTypes.func,
  onOpenSubMenu: PropTypes.func,
};


const useToolbarDividerStyles = makeStyles((theme) => ({
  divider: {
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5),
    border: 'none',
  },
  unrelatedDivider: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    border: 'none',
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