import React, { useState, useEffect, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import clsx from 'clsx';

import { CONTROL_PANEL_WIDTH, BOTTOM_DRAWER_HEIGHT } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import { pathwayDBLinkOut } from './links';
import { REG_COLOR_RANGE } from './network-style';
import PathwayTable from './pathway-table';
import SearchBar from './search-bar';
import { UpDownLegend, numToText } from './charts';

import { withStyles } from '@material-ui/core/styles';

import Collapse from '@material-ui/core/Collapse';
import { AppBar, Toolbar, Divider, Grid} from '@material-ui/core';
import { Drawer, Tooltip, Typography } from '@material-ui/core';
import { IconButton } from '@material-ui/core';

import ExpandIcon from '@material-ui/icons/ExpandLess';
import CollapseIcon from '@material-ui/icons/ExpandMore';


export const NODE_COLOR_SVG_ID = 'node-color-legend-svg';


export function BottomDrawer({ controller, classes, controlPanelVisible, isMobile, onShowDrawer }) {
  const [ open, setOpen ] = useState(false);
  const [ networkLoaded, setNetworkLoaded ] = useState(() => controller.isNetworkLoaded());
  const [ pathwayListIndexed, setPathwayListIndexed ] = useState(() => controller.isPathwayListIndexed());
  const [ searchValue, setSearchValue ] = useState('');
  const [ selectedNES, setSelectedNES ] = useState();
  const [ ignored, forceUpdate ] = useReducer(x => x + 1, 0);

  const searchValueRef = useRef(searchValue);
  searchValueRef.current = searchValue;

  const cy = controller.cy;
  const cyEmitter = new EventEmitterProxy(cy);

  const disabled = !networkLoaded || !pathwayListIndexed;

  const getSelectedIds = () => {
    const nodes = disabled ? null : cy.nodes(":childless:selected");
    if (nodes) {
      const ids = nodes.map(n => n.data('id'));
      return ids.sort();
    }
    return [];
  };

  const selNodesRef = useRef(null);
  const lastSelectedRowsRef = useRef([]); // Will be used to clear the search only when selecting a node on the network
  const selectedIds = getSelectedIds();

  const cancelSearch = () => {
    setSearchValue('');
  };
  const search = (val) => {
    // Unselect Cy elements first
    const selectedEles = cy.elements().filter(':selected');
    selectedEles.unselect();
    // Now execute the search
    const query = val.trim();
    if (query.length > 0) {
      setSearchValue(val);
    } else {
      cancelSearch();
    }
  };

  const debouncedSelectionHandler = _.debounce(() => {
    const eles = cy.nodes(":childless:selected");
    
    if (eles.length === 1 && eles[0].group() === 'nodes') {
      const nes = eles[0].data('NES');
      if (nes !== selectedNES) {
        setSelectedNES(nes);
      }
    } else {
      setSelectedNES(null);
    }
  }, 200);

  const onCySelectionChanged = () => {
    debouncedSelectionHandler();
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
    const clearSearch = _.debounce(() => {
      cancelSearch();
    }, 128);
    cyEmitter.on('add remove', onNetworkChanged);
    cyEmitter.on('select unselect', onCySelectionChanged);
    cyEmitter.on('select', evt => {
      const selId = evt.target.length === 1 ? evt.target.data('id') : null;
      if (!lastSelectedRowsRef.current.includes(selId)) {
        clearSearch();
      }
    });
    return () => {
      cyEmitter.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    const sel = cy.nodes(":childless:selected");
    selNodesRef.current = sel;
  }, []);

  const handleOpenDrawer = (b) => {
    setOpen(b);
    onShowDrawer(b);
  };

  const onTableSelectionChanged = (lastSelectedRows) => {
    lastSelectedRowsRef.current = lastSelectedRows;
  };
  
  const nodes = cy.nodes(':childless'); // ignore compound nodes!
  const totalPathways = disabled ? 0 : nodes.length;
  const data = [];
  
  if (!disabled) {
    for (const n of nodes) {
      const pathwayArr = n.data('name');

      const obj = {};
      obj.id = n.data('id');
      obj.name = n.data('label');
      obj.href = pathwayArr && pathwayArr.length === 1 ? pathwayDBLinkOut(pathwayArr[0]) : null;
      obj.nes = n.data('NES');
      obj.pvalue = n.data('pvalue');
      obj.cluster = n.data('mcode_cluster_id');
      obj.added = Boolean(n.data('added_by_user'));

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
      }
    }
  }

  const shiftDrawer = controlPanelVisible && !isMobile; 
  const magNES = controller.style ? controller.style.magNES : undefined;

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
            <Typography display="block" variant="subtitle2" color="textPrimary">
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
              style={{width: 276}}
              placeholder="Find pathways..."
              value={searchValue}
              onChange={search}
              onCancelSearch={cancelSearch}
            />
          )}
            <ToolbarDivider classes={classes} />
            <div className={classes.grow} />
          {!(open && isMobile) && magNES && (
            <Grid container direction="column" spacing={0} style={{minWidth: 40, maxWidth: 300, width: '100%', marginTop: 16}}>
              <Grid item>
                <UpDownLegend
                  value={selectedNES}
                  minValue={-magNES}
                  maxValue={magNES}
                  downColor={REG_COLOR_RANGE.downMax}
                  zeroColor={REG_COLOR_RANGE.zero}
                  upColor={REG_COLOR_RANGE.upMax}
                  height={16}
                  tooltip="Normalized Enrichment Score (NES)"
                  style={{width: '100%'}}
                />
              </Grid>
              <Grid item>
                <Grid container direction="row" spacing={0} justifyContent="space-between">
                <Tooltip title={`Downregulated (-${numToText(magNES)})`}>
                    <Typography variant="body2" component="div" className={classes.legendText}>DOWN</Typography>
                  </Tooltip>
                  <Tooltip title={`Upregulated (+${numToText(magNES)})`}>
                    <Typography variant="body2" component="div" className={classes.legendText}>UP</Typography>
                  </Tooltip>
                </Grid>
              </Grid>
            </Grid>
          )}
            <ToolbarDivider classes={classes} />
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
              initialSelectedIds={selectedIds}
              searchTerms={searchTerms}
              controller={controller}
              onTableSelectionChanged={onTableSelectionChanged}
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
  legendText: {
    fontSize: '0.75em',
    color: theme.palette.text.secondary,
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
};

export default withStyles(useStyles)(BottomDrawer);