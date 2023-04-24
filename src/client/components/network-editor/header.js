import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { DEFAULT_PADDING, CONTROL_PANEL_WIDTH } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import TitleEditor from './title-editor';
import { ShareMenu } from './share-panel';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Button, Snackbar, SnackbarContent, Toolbar } from '@material-ui/core';
import { Divider } from '@material-ui/core';
import { Popover, Menu, MenuItem} from "@material-ui/core";
import { Tooltip } from '@material-ui/core';
import { IconButton, Box } from '@material-ui/core';

import { AppLogoIcon } from '../svg-icons';
import MenuIcon from '@material-ui/icons/Menu';
import FitScreenIcon from '@material-ui/icons/SettingsOverscan';
import ReplyIcon from '@material-ui/icons/Reply';
import MoreIcon from '@material-ui/icons/MoreVert';
import CloseIcon from '@material-ui/icons/Close';

const MOBILE_MENU_ID = "menu-mobile";
const SHARE_MENU_ID = "menu-share";

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
      networkLoaded: this.controller.isNetworkLoaded(),
      snackOpen: false,
      snackMessage: ""
    };

    this.showMobileMenu = this.showMobileMenu.bind(this);
    this.onNetworkLoaded = this.onNetworkLoaded.bind(this);
  }

  componentDidMount() {
    this.controller.bus.on('networkLoaded', this.onNetworkLoaded);
  }

  componentWillUnmount() {
    this.controller.bus.removeListener('networkLoaded', this.onNetworkLoaded);
  }

  onNetworkLoaded() {
    this.setState({ networkLoaded: true });
  }

  showMenu(menuName, target) {
    this.setState({
      menuName: menuName,
      anchorEl: target,
    });
  }

  handleMenuClose() {
    this.setState({
      menuName: null,
      mobileMoreAnchorEl: null,
      anchorEl: null,
    });
  }

  showMobileMenu(event) {
    this.setState({ mobileMoreAnchorEl: event.currentTarget });
  }

  handleMobileMenuClose() {
    this.setState({ mobileMoreAnchorEl: null });
  }

  render() {
    const { anchorEl, menuName, networkLoaded } = this.state;
    const { classes, showControlPanel, isMobile, onShowControlPanel } = this.props;
    const { controller } = this;

    const showShareMenu = (event) => {
      this.showMenu(SHARE_MENU_ID, event.currentTarget);
    };

    const showSnackbar = (open, message='') => {
      this.setState({ snackOpen: open, snackMessage: message });
    };

    const buttonsDef = [
      {
        title: "Fit Figure to Screen",
        icon: <FitScreenIcon />,
        onClick: () => {
          controller.cy.animate({
            fit: { padding: DEFAULT_PADDING },
            easing: 'spring(480, 36)',
            duration: 750,
          });
        },
        unrelated: true,
      },
      {
        title: "Share",
        icon: <ReplyIcon style={{transform: 'scaleX(-1)'}} />,
        onClick: showShareMenu,
        unrelated: false,
      },
    ];

    const ToolbarDivider = ({ unrelated }) => {
      return <Divider orientation="vertical" flexItem variant="middle" className={unrelated ? classes.unrelatedDivider : classes.divider} />;
    };

    const shiftAppBar = showControlPanel && !isMobile;
    
    return (
      <>
        <Snackbar
          className={classes.snackBar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          open={this.state.snackOpen} 
          autoHideDuration={4000} 
          onClose={() => showSnackbar(false)} 
        >
          <SnackbarContent 
            className={classes.snackBarContent}
            message={<span>{this.state.snackMessage}</span>}
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
            <ToolbarDivider unrelated />
            <TitleEditor controller={controller} disabled={!networkLoaded} />
            <ToolbarDivider unrelated />
            <div className={classes.sectionDesktop}>
              { buttonsDef.map(({title, icon, onClick, unrelated}, idx) =>
                <Fragment key={idx}>
                  <ToolbarButton
                    title={title}
                    icon={icon}
                    disabled={!networkLoaded}
                    onClick={onClick}
                  />
                  <ToolbarDivider unrelated={unrelated} />
                </Fragment>
              )}
            </div>
            <div className={classes.sectionMobile}>
              <ToolbarButton
                title="Options"
                icon={<MoreIcon />}
                onClick={(evt) => this.showMobileMenu(evt)}
              />
            </div>
          </Toolbar>
          {this.renderMobileMenu(buttonsDef)}
          {anchorEl && (
            <Popover
              id="menu-popover"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              onClose={() => this.handleMenuClose()}
            >
              {menuName === SHARE_MENU_ID && (
                <ShareMenu 
                  controller={controller} 
                  onClose={() => this.handleMenuClose()}
                  showMessage={message => showSnackbar(true, message)}
                />
              )}
            </Popover>
          )}
        </AppBar>
      </>
    );
  }

  renderMobileMenu(buttonsDef) {
    const { mobileMoreAnchorEl } = this.state;
    const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

    return (
      <Menu
        anchorEl={mobileMoreAnchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        id={MOBILE_MENU_ID}
        keepMounted
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={isMobileMenuOpen}
        onClose={() => this.handleMobileMenuClose()}
      >
        { buttonsDef.map(({title, icon, onClick}, idx) =>
          <MenuItem key={idx} onClick={onClick}>
            <IconButton>{icon}</IconButton>
            <p>{title}</p>
          </MenuItem>
        )}
      </Menu>
    );
  }
}

class ToolbarButton extends Component {
  render() {
    const { title, icon, color, className, disabled, onClick } = this.props;

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

Header.propTypes = {
  classes: PropTypes.object.isRequired,
  controller: PropTypes.instanceOf(NetworkEditorController),
  showControlPanel: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  onShowControlPanel: PropTypes.func.isRequired,
};

export default withStyles(useStyles)(Header);