import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import _ from 'lodash';

import { CONTROL_PANEL_WIDTH } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import { pathwayDBLinkOut } from './links';
import { nodeLabel } from './network-style';
import PathwayTable from './pathway-table';

import { withStyles } from '@material-ui/core/styles';

import Collapse from '@material-ui/core/Collapse';
import { AppBar, Toolbar, Divider } from '@material-ui/core';
import { Drawer, Container, Box, Grid, Tooltip, Typography } from '@material-ui/core';
import { Fab, Button, IconButton } from '@material-ui/core';
import { List, ListItem, ListItemText } from '@material-ui/core';

import ExpandIcon from '@material-ui/icons/ExpandLess';
import CollapseIcon from '@material-ui/icons/ExpandMore';
import SearchIcon from '@material-ui/icons/Search';
import MoreIcon from '@material-ui/icons/MoreVert';
import AddIcon from '@material-ui/icons/Add';
import CloseIcon from '@material-ui/icons/Close';
import CircularProgressIcon from '@material-ui/core/CircularProgress';


export function BottomDrawer({ controller, classes, controlPanelVisible, isMobile, onShowDrawer, onShowSearchDialog }) {
  const [ open, setOpen ] = useState(false);
  const [ networkLoaded, setNetworkLoaded ] = useState(() => controller.isNetworkLoaded());
  const [ pathwayListIndexed, setPathwayListIndexed ] = useState(() => controller.isPathwayListIndexed());
  // const [ selectedNode, setSelectedNode ] = useState(null);

  const cy = controller.cy;
  // const cyEmitter = new EventEmitterProxy(cy);

  // const debouncedSelectionHandler = _.debounce(() => {
  //   const eles = cy.$(':selected');

  //   if (eles.length > 0) {
  //     const ele = eles[eles.length - 1];
  //     setSelectedNode(ele);
  //     // setSort(ele.data('NES') < 0 ? 'up' : 'down');
  //     // fetchGeneListFromNodeOrEdge(ele);
  //   } else { //if (searchValueRef.current == null || searchValueRef.current.trim() === '') {
  //     setSelectedNode(null);
  //     // fetchAllRankedGenes();
  //   }
  // }, 250);

  // const onGeneListIndexed = () => {
  //   // setGeneListIndexed(true);
  //   debouncedSelectionHandler();
  // };

  // const onCySelectionChanged = () => {
  //   debouncedSelectionHandler();
  // };

  // const cancelSearch = () => {
  //   // setSearchValue('');
  //   // setSearchResult(null);
  // };
  // const search = (val) => {
  //   // const query = val.trim();
    
  //   // if (val.length > 0) {
  //   //   // Unselect Cy elements first
  //   //   const selectedEles = cy.elements().filter(':selected');
  //   //   selectedEles.unselect();
  //   //   // Now execute the search
  //   //   const res = controller.searchGenes(query);
  //   //   setSearchValue(val);
  //   //   setSearchResult(res);
  //   // } else {
  //   //   cancelSearch();
  //   // }
  // };

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

  // useEffect(() => {
  //   const clearSearch = _.debounce(() => {
  //     cancelSearch();
  //   }, 128);

  //   cyEmitter.on('select unselect', onCySelectionChanged);

  //   cyEmitter.on('select', () => {
  //     clearSearch();
  //   });

  //   return function cleanup() {
  //     cyEmitter.removeAllListeners();
  //   };
  // }, []);

  const handleOpenDrawer = (b) => {
    setOpen(b);
    onShowDrawer(b);
  };

  const searchPathwayGenes = (name) => { // TODO Delete this function
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
      <div
        className={clsx(classes.drawerContent, { [classes.drawerContentShift]: shiftDrawer })}
        role="presentation"
      >
        <AppBar position="fixed" color="default" className={clsx(classes.appBar, { [classes.appBarShift]: shiftDrawer })}>
          <Toolbar variant="dense">
            <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title}>
              Pathways&nbsp;
            {totalPathways >= 0 && (
              <Typography display="inline" variant="body2" color="textSecondary">
                ({ totalPathways })
              </Typography>
            )}
            </Typography>
            <div className={classes.grow} />
          {/* {isMobile ? ( */}
            <Fab color="primary" className={classes.addButton} onClick={onShowSearchDialog} disabled={disabled}>
              <AddIcon />
            </Fab>
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
            <PathwayTable visible={open} data={data} initialSelectedId={selectedId} controller={controller} />
          </Collapse>
        </AppBar>
      </div>
    </Drawer>
  );
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
  hide: {
    display: 'none',
  },
  drawer: {
    position: 'absolute',
    // zIndex: 999,
    top: 'auto',
    bottom: 0,
    background: theme.palette.background.default,
    // width: '100%',
    // flexShrink: 0,
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
    // width: CONTROL_PANEL_WIDTH,
    height: 'auto',
    background: theme.palette.background.default,
  },
  drawerContent: {
    background: 'inherit',
    // height: 460,
    width: '100%',
    // flexShrink: 0,
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
  addButton: {
    // [theme.breakpoints.down('sm')]: {
      position: 'absolute',
      zIndex: 1,
      top: -30,
      left: 0,
      right: 0,
      margin: '0 auto',
      boxShadow: '0 0 10px black',
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