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

import NavigateBeforeIcon from '@material-ui/icons/NavigateBefore';
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import ExpandIcon from '@material-ui/icons/ExpandLess';
import CollapseIcon from '@material-ui/icons/ExpandMore';


export const NODE_COLOR_SVG_ID = 'node-color-legend-svg';

function toTableData(nodes, sortFn) {
  const data = [];

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

  return sortFn ? sortFn(data) : data;
}


export function BottomDrawer({ controller, classes, controlPanelVisible, isMobile, onShowDrawer }) {
  const [ open, setOpen ] = useState(false);
  const [ networkLoaded, setNetworkLoaded ] = useState(() => controller.isNetworkLoaded());
  const [ pathwayListIndexed, setPathwayListIndexed ] = useState(() => controller.isPathwayListIndexed());
  const [ searchValue, setSearchValue ] = useState('');
  const [ totalSelected, setTotalSelected ] = useState(controller.cy.nodes(":childless:selected").length);
  const [ selectedNES, setSelectedNES ] = useState();
  const [ selectedIds, setSelectedIds ] = useState([]);
  const [ currentSelectedIndex, setCurrentSelectedIndex ] = useState(-1);
  const [ scrollToId, setScrollToId ] = useState();
  const [ ignored, forceUpdate ] = useReducer(x => x + 1, 0);

  const openRef = useRef(false);
  openRef.current = open;

  const searchValueRef = useRef(searchValue);
  searchValueRef.current = searchValue;

  const dataRef = useRef();
  const sortFnRef = useRef();

  const disabledRef = useRef(true);
  disabledRef.current = !networkLoaded || !pathwayListIndexed;
  
  const cy = controller.cy;
  const cyEmitter = new EventEmitterProxy(cy);

  const getSelectedIds = () => {
    const eles = disabledRef.current ? null : cy.$(":selected");
    const set = new Set();
    eles.forEach(el => {
      if (el.group() === 'nodes') { // nodes, except compounds
        if (!el.isParent()) {
          set.add(el.data('id'));
        }
      } else { // edges
        set.add(el.source().data('id'));
        set.add(el.target().data('id'));
      }
    });
    return Array.from(set);
  };

  const selNodesRef = useRef();
  const lastSelectedRowsRef = useRef([]); // Will be used to clear the search only when selecting a node on the network

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
    // Selected IDs
    const selIds = getSelectedIds();
    setSelectedIds(selIds);
    setTotalSelected(selIds.length);
    // NES (only if there's only one selected pathway)
    if (selIds.length === 1) {
      const sel = cy.filter(`[id = "${selIds[0]}"]`);
      const nes = sel.length === 1 ? sel[0].data('NES') : null;
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
    cyEmitter.on('tap', evt => {
      if (openRef.current) {
        // When the table is opened, scroll to the clicked pathway
        var ele = evt.target;
        if (ele !== cy) { // Ignore clicks on the background!
          if (ele.group() === 'nodes') {
            setScrollToId(ele.data('id'));
          } else {
            // Sort the two nodes connected by this edge and get the id of the first one
            const tmpData = toTableData([ ele.source(), ele.target() ], sortFnRef.current);
            const id = tmpData[0].id;
            setScrollToId(id);
          }
        }
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

  const onTableSelectionChanged = (selectedIds) => {
    lastSelectedRowsRef.current = selectedIds;
  };
  const onDataSorted = (sortFn) => {
    sortFnRef.current = sortFn; // Save the current sort function for later use
  };

  const goToRow = (idx) => {
    setCurrentSelectedIndex(idx);
    // Sort selected Ids
    if (dataRef && sortFnRef.current) {
      const sortedData = sortFnRef.current(dataRef.current);
      const sortedSelectedIds = sortedData.filter(obj => selectedIds.includes(obj.id)).map(obj => obj.id);
      const id = sortedSelectedIds[idx];
      console.log('==> goToRow: ' + idx);
      setScrollToId(id);
    }
  };
  
  const nodes = cy.nodes(':childless'); // ignore compound nodes!
  const disabled = disabledRef.current;
  const totalPathways = disabled ? 0 : nodes.length;
  const data = disabled ? [] : toTableData(nodes);
  dataRef.current = data;

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
            <>
              <SearchBar
                style={{width: 276}}
                placeholder="Find pathways..."
                value={searchValue}
                onChange={search}
                onCancelSearch={cancelSearch}
              />
              <ToolbarDivider classes={classes} />
              <SelectionNavigator length={totalSelected} onChange={goToRow} />
            </>
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
              selectedIds={selectedIds}
              currentSelectedIndex={currentSelectedIndex}
              scrollToId={scrollToId}
              searchTerms={searchTerms}
              controller={controller}
              onTableSelectionChanged={onTableSelectionChanged}
              onDataSorted={onDataSorted}
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
ToolbarButton.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired,
  color: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};


function ToolbarDivider({ classes, unrelated }) {
  return <Divider orientation="vertical" flexItem variant="middle" className={unrelated ? classes.unrelatedDivider : classes.divider} />;
}
ToolbarDivider.propTypes = {
  classes: PropTypes.object.isRequired,
  unrelated: PropTypes.bool
};


const SelectionNavigator = ({ length, initialIndex = -1, onChange }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  const navigateTo = (index) => {
    setCurrentIndex(index);
    if (onChange) {
      onChange(index);
    }
  };
  console.log(length + " :: " + currentIndex);

  return (
    <div style={{minWidth: 100}}>
      <IconButton
        disabled={length < 2 || currentIndex <= 0}
        onClick={() => navigateTo(currentIndex - 1)}
      >
        <NavigateBeforeIcon size="small" />
      </IconButton>
      <IconButton
        disabled={length < 2 || currentIndex === length - 1}
        onClick={() => navigateTo(currentIndex + 1)}
      >
        <NavigateNextIcon size="small" />
      </IconButton>
    </div>
  );
};
SelectionNavigator.propTypes = {
  length: PropTypes.number.isRequired,
  initialIndex: PropTypes.number,
  onChange: PropTypes.func,
};


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

BottomDrawer.propTypes = {
  classes: PropTypes.object.isRequired,
  controller: PropTypes.instanceOf(NetworkEditorController),
  isMobile: PropTypes.bool.isRequired,
  controlPanelVisible: PropTypes.bool.isRequired,
  onShowDrawer: PropTypes.func.isRequired,
};

export default withStyles(useStyles)(BottomDrawer);