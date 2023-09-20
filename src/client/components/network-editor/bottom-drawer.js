import React, { useState, useEffect, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import _ from 'lodash';

import { CONTROL_PANEL_WIDTH, BOTTOM_DRAWER_HEIGHT } from '../defaults';
import { NetworkEditorController } from './controller';
import { pathwayDBLinkOut } from './links';
import { nodeLabel } from './network-style';
import PathwayTable from './pathway-table';

import { withStyles } from '@material-ui/core/styles';

import Collapse from '@material-ui/core/Collapse';
import { AppBar, Toolbar, Divider } from '@material-ui/core';
import { Drawer, Tooltip, Typography } from '@material-ui/core';
import { Fab, IconButton } from '@material-ui/core';
import SearchBar from "material-ui-search-bar";

import ExpandIcon from '@material-ui/icons/ExpandLess';
import CollapseIcon from '@material-ui/icons/ExpandMore';
import AddIcon from '@material-ui/icons/Add';


export function BottomDrawer({ controller, classes, controlPanelVisible, isMobile, onShowDrawer, onShowSearchDialog }) {
  const [ open, setOpen ] = useState(false);
  const [ networkLoaded, setNetworkLoaded ] = useState(() => controller.isNetworkLoaded());
  const [ pathwayListIndexed, setPathwayListIndexed ] = useState(() => controller.isPathwayListIndexed());
  const [searchValue, setSearchValue] = useState('');
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);

  const searchValueRef = useRef(searchValue);
  searchValueRef.current = searchValue;

  const cy = controller.cy;
  // const cyEmitter = new EventEmitterProxy(cy);

  const cancelSearch = () => {
    setSearchValue('');
  };
  const search = (val) => {
    const query = val.trim();
    if (query.length > 0) {
      setSearchValue(val);
    } else {
      cancelSearch();
    }
  };

  useEffect(() => {
    const onNetworkLoaded = () => setNetworkLoaded(true);
    const onPathwayListIndexed = () => setPathwayListIndexed(true);
    controller.bus.on('networkLoaded', onNetworkLoaded);
    controller.bus.on('pathwayListIndexed', onPathwayListIndexed);
    return () => {
      controller.bus.removeListener('networkLoaded', onNetworkLoaded);
      controller.bus.removeListener('pathwayListIndexed', onPathwayListIndexed);
    };
  }, []);

  useEffect(() => {
    const onNetworkChanged = () => {
      if (controller.isNetworkLoaded()) {
        forceUpdate();
      }
    };
    cy.on('add remove', onNetworkChanged);
    return () => cy.removeListener('add remove', onNetworkChanged);
  }, []);

  const handleOpenDrawer = (b) => {
    setOpen(b);
    onShowDrawer(b);
  };

  const searchPathwayGenes = (name) => { // TODO Delete this function when genes are returned from cytoscape/mongodb
    const results = controller.searchPathways(name);
    for (const res of results) {
      if (res.name === name) {
        return res.genes;
      }
    }
    return [];
  };

  const disabled = !networkLoaded || !pathwayListIndexed;
  const totalPathways = disabled ? 0 : cy.nodes().length;
  const data = [];
  
  if (!disabled) {
    for (const n of cy.nodes()) {
      const pathwayArr = n.data('name');

      const obj = {};
      obj.id = n.data('id');
      obj.name = nodeLabel(n);
      obj.href = pathwayArr.length === 1 ? pathwayDBLinkOut(pathwayArr[0]) : null;
      obj.nes = n.data('NES');
      obj.pvalue = n.data('pvalue');
      obj.cluster = n.data('mcode_cluster_id');
      obj.added = Boolean(n.data('added_by_user'));
      obj.pathways = [];

      const pathwayNames = [];
      if (pathwayArr.length > 1) {
        for (const p of pathwayArr) {
          if (p.indexOf('%') >= 0) {
            const name = p.substring(0, p.indexOf('%')).toLowerCase();
            const href = pathwayDBLinkOut(p);
            obj.pathways.push({ name, href });
            pathwayNames.push(name);
          }
        }
      }
      // TODO better get them from cytoscape/Mongo, because pathway names can be duplicated when from diff DBs
      if (obj.cluster) {
        obj.genes = [];
        for (const pn of pathwayNames) {
          obj.genes = obj.genes.concat(searchPathwayGenes(pn));
          obj.genes = [...new Set(obj.genes)]; // remove duplicates
        }
      } else {
        obj.genes = searchPathwayGenes(obj.name);
      }
      obj.genes.sort();

      data.push(obj);
    }
  }

  // Filter out pathways that don't match the search terms
  let filteredData; 
  const searchTerms = searchValue == null ? [] : searchValue.toLowerCase().trim().split(' ');

  if (searchTerms.length > 0) {
    filteredData = [];

    OUTER:
    for (const obj of data) {
      for (const term of searchTerms) {
        if (obj.name.toLowerCase().includes(term)) {
          filteredData.push(obj);
          continue OUTER;
        }
        for (const p of obj.pathways) {
          if (p.name.toLowerCase().includes(term)) {
            filteredData.push(obj);
            continue OUTER;
          }
        }
      }
    }
  }

  const sel = disabled ? null : cy.nodes(':selected');
  const selectedId = (sel && sel.length === 1) ? sel[0].data('id') : null;

  const shiftDrawer = controlPanelVisible && !isMobile;

  return (
    <Drawer
      className={clsx(classes.drawer, { [classes.drawerShift]: shiftDrawer })}
      variant="permanent"
      anchor="bottom"
      open={true}
      PaperProps={{
        style: {
          overflow: "hidden"
        }
      }}
      classes={{
        paper: classes.drawerPaper,
      }}
    >
      <div role="presentation" className={clsx(classes.drawerContent, { [classes.drawerContentShift]: shiftDrawer })}>
        <AppBar position="fixed" color="default" className={clsx(classes.appBar, { [classes.appBarShift]: shiftDrawer })}>
          <Toolbar variant="dense" className={classes.toolbar}>
          {!open && (
            <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title}>
              Pathways&nbsp;
            {totalPathways >= 0 && (
              <Typography display="inline" variant="body2" color="textSecondary">
                ({ totalPathways })
              </Typography>
            )}
            </Typography>
          )}
          {open && (
            <SearchBar
              className={classes.searchBar}
              placeholder="Find pathways..."
              value={searchValue}
              onChange={search}
              onCancelSearch={cancelSearch}
            />
          )}
            <div className={classes.grow} />
          {/* {isMobile ? ( */}
            <Tooltip title="Add Pathway">
              <span>
                <Fab color="primary" disabled={disabled} className={classes.addButton} onClick={onShowSearchDialog}>
                  <AddIcon />
                </Fab>
              </span>
            </Tooltip>
          {/* ) : (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={onShowSearchDialog}>Add Pathway</Button>
          )} */}
            <div className={classes.grow} />
            <ToolbarButton
              title="Pathways"
              icon={open ? <CollapseIcon fontSize="large" /> : <ExpandIcon fontSize="large" />}
              edge="start"
              disabled={disabled}
              onClick={() => handleOpenDrawer(!open)}
            />
          </Toolbar>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <PathwayTable
              visible={open}
              data={filteredData ? filteredData : data}
              initialSelectedId={selectedId}
              controller={controller}
            />
          </Collapse>
        </AppBar>
      </div>
    </Drawer>
  );
}


function ToolbarButton({ title, icon, color, className, disabled, onClick }) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          disabled={disabled}
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


const useStyles = theme => ({
  appBar: {
    backgroundColor: theme.palette.background.default,
    minHeight: BOTTOM_DRAWER_HEIGHT,
    top: 'auto',
    bottom: 0,
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
  toolbar: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
  hide: {
    display: 'none',
  },
  drawer: {
    position: 'absolute',
    top: 'auto',
    bottom: 0,
    background: theme.palette.background.default,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  drawerShift: {
    width: `calc(100% - ${CONTROL_PANEL_WIDTH}px)`,
    marginLeft: CONTROL_PANEL_WIDTH,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerPaper: {
    height: 'auto',
    background: theme.palette.background.default,
  },
  drawerContent: {
    background: 'inherit',
    width: '100%',
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  drawerContentShift: {
    width: `calc(100% - ${CONTROL_PANEL_WIDTH}px)`,
    marginLeft: CONTROL_PANEL_WIDTH,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  list: {
    width: 250,
  },
  fullList: {
    width: 'auto',
  },
  title: {
    // fontWeight: 'bold',
  },
  grow: {
    flexGrow: 1,
  },
  searchBar: {
    marginLeft: -theme.spacing(1),
    borderColor: theme.palette.divider,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: theme.spacing(4),
    height: 36,
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
  addButton: {
    // [theme.breakpoints.down('sm')]: {
      position: 'absolute',
      zIndex: 1,
      top: -30,
      left: 0,
      right: 0,
      margin: '0 auto',
      boxShadow: '0 0 10px black',
      "&[disabled]": {
        display: 'none',
      },
    // },
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

BottomDrawer.propTypes = {
  classes: PropTypes.object.isRequired,
  controller: PropTypes.instanceOf(NetworkEditorController),
  isMobile: PropTypes.bool.isRequired,
  controlPanelVisible: PropTypes.bool.isRequired,
  onShowDrawer: PropTypes.func.isRequired,
  onShowSearchDialog: PropTypes.func.isRequired,
};

export default withStyles(useStyles)(BottomDrawer);