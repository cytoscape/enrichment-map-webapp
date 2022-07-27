import React, { Component } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { DEFAULT_PADDING } from './defaults';
import TitleEditor from './title-editor';
import ShareButton from './share-button';
import { NetworkEditorController } from './controller';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Toolbar } from '@material-ui/core';
import { Divider } from '@material-ui/core';
import { Popover, MenuList, MenuItem} from "@material-ui/core";
import { Tooltip } from '@material-ui/core';
import { IconButton, Box } from '@material-ui/core';

import { AppLogoIcon } from '../svg-icons';
import MenuIcon from '@material-ui/icons/Menu';
import FitScreenIcon from '@material-ui/icons/SettingsOverscan';

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
      menu: null,
      anchorEl: null,
      dialogId: null,
    };
  }

  handleClick(event, menuName) {
    this.showMenu(menuName, event.currentTarget);
  }

  handleClose() {
    this.setState({
      menuName: null,
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
    const { anchorEl, menuName, dialogName } = this.state;
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
            <Box component="div" sx={{ display: { xs: 'none', sm: 'inline-block' } }}>
              <Tooltip arrow placement="bottom" title="EnrichmentMap Home">
                <IconButton 
                  aria-label='close' 
                  onClick={() => location.href = '/'}
                >
                  <AppLogoIcon style={{ fontSize: 28 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <TitleEditor controller={controller} />
            <ToolbarDivider unrelated />
            <ToolbarButton
              title="Fit Network"
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
          </Toolbar>
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

const drawerWidth = 240;

const useStyles = theme => ({
  appBar: {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
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