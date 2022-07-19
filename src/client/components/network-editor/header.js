import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { DEFAULT_PADDING } from './defaults';
import TitleEditor from './title-editor';
import ShareButton from './share-button';
import { NetworkEditorController } from './controller';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Toolbar } from '@material-ui/core';
import { Grid, Divider } from '@material-ui/core';
import { Popover, MenuList, MenuItem} from "@material-ui/core";
import { Tooltip } from '@material-ui/core';
import { IconButton } from '@material-ui/core';

import { AppLogoIcon } from '../svg-icons';
import SearchIcon from '@material-ui/icons/Search'; // eslint-disable-line
import DebugIcon from '@material-ui/icons/BugReport'; // eslint-disable-line
import FitScreenIcon from '@material-ui/icons/Fullscreen';

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
    const { classes } = this.props;
    const { controller } = this;

    const ToolbarDivider = ({ unrelated }) => {
      return <Divider orientation="vertical" flexItem variant="middle" className={unrelated ? classes.unrelatedDivider : classes.divider} />;
    };
    
    return (
      <>
        <AppBar position="relative" color='default'>
          <Toolbar variant="dense">
            <Grid container alignItems='center' justifyContent="space-between">
              <Grid item>
                <Grid container alignItems='center' className={classes.root}>
                  <Grid item>
                    <Tooltip arrow placement="bottom" title="EnrichmentMap Home">
                      <IconButton 
                        aria-label='close' 
                        onClick={() => location.href = '/'}
                      >
                        <AppLogoIcon style={{ fontSize: 28 }} />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                  <Grid item>
                    <div className="header-title-area">
                      <TitleEditor controller={controller} />
                      <div className="header-title-save-status">Edits saved</div>
                    </div>
                  </Grid>
                </Grid>
              </Grid>

              <Grid item>
                <Grid container alignItems="center" color="secondary.main" className={classes.root}>
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
                </Grid>
              </Grid>
            </Grid>
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
    const { title, icon, color, onClick } = this.props;

    return (
      <Tooltip arrow placement="bottom" title={title}>
        <IconButton size="small" color={color || 'inherit'} onClick={onClick}>
          { icon }
        </IconButton>
      </Tooltip>
    );
  }
}

const useStyles = theme => ({
  root: {
    width: 'fit-content',
  },
  divider: {
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5),
    width: 0,
  },
  unrelatedDivider: {
    marginLeft: theme.spacing(2.5),
    marginRight: theme.spacing(2.5),
    width: 0,
  },
});

ToolbarButton.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired,
  color: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

Header.propTypes = {
  classes: PropTypes.object.isRequired,
  controller: PropTypes.instanceOf(NetworkEditorController)
};

export default withStyles(useStyles)(Header);