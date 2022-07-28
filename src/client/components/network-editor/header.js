import React, { Component } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { DEFAULT_PADDING, CONTROL_PANEL_WIDTH } from './defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import TitleEditor from './title-editor';
import ShareButton from './share-button';
import { NetworkEditorController } from './controller';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Toolbar } from '@material-ui/core';
import { Divider } from '@material-ui/core';
import { Popover, Menu, MenuList, MenuItem} from "@material-ui/core";
import { Tooltip } from '@material-ui/core';
import { IconButton, Box } from '@material-ui/core';

import { AppLogoIcon } from '../svg-icons';
import MenuIcon from '@material-ui/icons/Menu';
import FitScreenIcon from '@material-ui/icons/SettingsOverscan';
import ScreenShareIcon from '@material-ui/icons/ScreenShare';
import MoreIcon from '@material-ui/icons/MoreVert';

const FIT_NETWORK = "Fit Network";
const SHARE = "Share";

const mobileMenuId = "menu-mobile";

/**
 * The network editor's header or app bar.
 * @param {Object} props React props
 */
export class Header extends Component {

  constructor(props) {
    super(props);

    this.controller = props.controller;
    this.busProxy = new EventEmitterProxy(this.controller.bus);

    this.state = {
      menuName: null,
      mobileMoreAnchorEl: null,
      anchorEl: null,
      dialogId: null,
    };

    this.handleMobileMenuOpen = this.handleMobileMenuOpen.bind(this);
  }

  handleMobileMenuOpen(event) {
    this.setState({ mobileMoreAnchorEl: event.currentTarget });
  }

  handleMobileMenuClose() {
    this.setState({ mobileMoreAnchorEl: null });
  }

  handleClick(event, menuName) {
    this.showMenu(menuName, event.currentTarget);
  }

  handleClose() {
    this.setState({
      menuName: null,
      mobileMoreAnchorEl: null,
      anchorEl: null,
      dialogName: null,
    });
  }

  showMenu(menuName, anchorEl) {
    this.setState({
      menuName: menuName,
      anchorEl: anchorEl,
      dialogName: null,
    });
  }

  goBackToMenu(menuName) {
    this.setState({
      menuName: menuName,
      dialogName: null,
    });
  }

  showDialog(dialogName, menuName) {
    this.setState({
      menuName: menuName,
      anchorEl: menuName ? this.state.anchorEl : null,
      dialogName: dialogName,
    });
  }

  hideDialog() {
    this.setState({
      menuName: null,
      anchorEl: null,
      dialogName: null,
    });
  }

  componentDidMount() {
    const dirty = () => this.setState({ dirty: Date.now() });
    this.busProxy.on('toggleDrawMode', dirty);
  }

  componentWillUnmount() {
    this.busProxy.removeAllListeners();
  }

  render() {
    const { anchorEl, menuName } = this.state;
    const { classes, onShowControlPanel, showControlPanel } = this.props;
    const { controller } = this;

    const ToolbarDivider = ({ unrelated }) => {
      return <Divider orientation="vertical" flexItem variant="middle" className={unrelated ? classes.unrelatedDivider : classes.divider} />;
    };
    
    return (
      <>
        <AppBar
          position="relative"
          color='default'
          className={clsx(classes.appBar, { [classes.appBarShift]: showControlPanel })}
        >
          <Toolbar variant="dense">
            <ToolbarButton
              title="Control Panel"
              icon={<MenuIcon />}
              edge="start"
              className={classes.menuButton}
              onClick={() => onShowControlPanel(!showControlPanel)}
            />
            <Box component="div" sx={{ display: { xs: 'none', sm: 'inline-block' }}}>
              <Tooltip arrow placement="bottom" title="EnrichmentMap Home">
                <IconButton 
                  aria-label='close' 
                  onClick={() => location.href = '/'}
                >
                  <AppLogoIcon style={{ fontSize: 28 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <ToolbarDivider unrelated />
            <TitleEditor controller={controller} />
            <ToolbarDivider unrelated />
            <div className={classes.sectionDesktop}>
              <ToolbarButton
                title={FIT_NETWORK}
                icon={<FitScreenIcon />}
                onClick={() => controller.cy.fit(DEFAULT_PADDING)}
              />
              {/* <ToolbarDivider unrelated />
              <ToolbarButton
                title="Search"
                icon={<SearchIcon />}
                onClick={() => console.log('Search NOT IMPLEMENTED...')}
              /> */}
              <ToolbarDivider unrelated />
              <ShareButton controller={controller}/>
              <ToolbarDivider />
              {/* <ToolbarButton
                title="Debug"
                icon={<DebugIcon />}
                onClick={e => this.handleClick(e, 'debug')} 
              /> */}
            </div>
            <div className={classes.sectionMobile}>
              <ToolbarButton
                title="Options"
                icon={<MoreIcon />}
                onClick={(event) => this.handleMobileMenuOpen(event)}
              />
            </div>
          </Toolbar>
          {this.renderMobileMenu()}
          {anchorEl && (
            <Popover
              id="menu-popover"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => this.handleClose()}
            >
              {menuName === 'account' && (
                <MenuList>
                  <MenuItem disabled={true} onClick={() => this.handleClose()}>Sign Out</MenuItem>
                </MenuList>
              )}
              {/* {menuName === 'debug' && !dialogName && (
                <MenuList>
                  <MenuItem disabled={false} onClick={() => this.showDialog('dialog-name')}>Item Title Here</MenuItem>
                </MenuList>
              )} */}
            </Popover>
          )}
        </AppBar>
      </>
    );
  }

  renderMobileMenu() {
    const { controller } = this;
    const { mobileMoreAnchorEl } = this.state;

    const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

    return (
      <Menu
        anchorEl={mobileMoreAnchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        id={mobileMenuId}
        keepMounted
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={isMobileMenuOpen}
        onClose={() => this.handleMobileMenuClose()}
      >
        <MenuItem onClick={() => controller.cy.fit(DEFAULT_PADDING)}>
          <IconButton>
            <FitScreenIcon />
          </IconButton>
          <p>{FIT_NETWORK}</p>
        </MenuItem>
        <MenuItem onClick={() => controller.cy.fit(DEFAULT_PADDING)}>
          <IconButton>
            <ScreenShareIcon />
          </IconButton>
          <p>{SHARE}</p>
        </MenuItem>
      </Menu>
    );
  }
}

class ToolbarButton extends Component {

  render() {
    const { title, icon, color, className, onClick } = this.props;

    return (
      <Tooltip arrow placement="bottom" title={title}>
        <IconButton size="small" color={color || 'inherit'} className={className} onClick={onClick}>
          { icon }
        </IconButton>
      </Tooltip>
    );
  }
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
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5),
    width: 0,
  },
  unrelatedDivider: {
    marginLeft: theme.spacing(1.5),
    marginRight: theme.spacing(1.5),
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
});

ToolbarButton.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired,
  color: PropTypes.string,
  className: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

Header.propTypes = {
  classes: PropTypes.object.isRequired,
  controller: PropTypes.instanceOf(NetworkEditorController),
  onShowControlPanel: PropTypes.func.isRequired,
  showControlPanel: PropTypes.bool.isRequired,
};

export default withStyles(useStyles)(Header);