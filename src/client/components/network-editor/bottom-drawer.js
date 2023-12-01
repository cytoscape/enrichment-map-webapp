import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import clsx from 'clsx';

import { LEFT_DRAWER_WIDTH, BOTTOM_DRAWER_HEIGHT } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import { pathwayDBLinkOut } from './links';
import { REG_COLOR_RANGE, nodeLabel } from './network-style';
import PathwayTable, { DEF_SORT_FN } from './pathway-table';
import SearchBar from './search-bar';
import { UpDownLegend, numToText } from './charts';

import { makeStyles } from '@material-ui/core/styles';

import Collapse from '@material-ui/core/Collapse';
import { AppBar, Toolbar, Divider, Grid } from '@material-ui/core';
import { Drawer, Tooltip, Typography } from '@material-ui/core';
import { Button, IconButton } from '@material-ui/core';

import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import ExpandIcon from '@material-ui/icons/ExpandLess';
import CollapseIcon from '@material-ui/icons/ExpandMore';


export const NODE_COLOR_SVG_ID = 'node-color-legend-svg';


function toTableRow(node) {
  const pathwayArr = node.data('name');
  const pathwayLinkOut = pathwayArr && pathwayArr.length === 1 ? pathwayDBLinkOut(pathwayArr[0]) : null;

  const row = {};
  row.id = node.data('id');
  row.name = nodeLabel(node);
  row.db = pathwayLinkOut?.name;
  row.href = pathwayLinkOut?.href;
  row.icon = pathwayLinkOut?.icon;
  row.nes = node.data('NES');
  row.pvalue = node.data('padj'); // NOTICE we are using the adjusted p-value!
  row.cluster = node.isChild() ? nodeLabel(node.parent()) : null;

  return row;
}

function toTableData(nodes, sortFn) {
  const data = [];

  for (const n of nodes) {
    const row = toTableRow(n);
    data.push(row);
  }

  return sortFn ? sortFn(data) : data;
}

//==[ BottomDrawer ]==================================================================================================

const useBottomDrawerStyles = makeStyles((theme) => ({
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
    width: `calc(100% - ${LEFT_DRAWER_WIDTH}px)`,
    marginLeft: LEFT_DRAWER_WIDTH,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  toolbar: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(1),
  },
  toolbarOpen: {
    paddingLeft: theme.spacing(1.115),
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
    width: `calc(100% - ${LEFT_DRAWER_WIDTH}px)`,
    marginLeft: LEFT_DRAWER_WIDTH,
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
    width: `calc(100% - ${LEFT_DRAWER_WIDTH}px)`,
    marginLeft: LEFT_DRAWER_WIDTH,
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
  legendText: {
    fontSize: '0.75em',
    color: theme.palette.text.secondary,
  },
}));

export function BottomDrawer({ controller, open, leftDrawerOpen, isMobile, isTablet, onToggle }) {
  const [ disabled, setDisabled ] = useState(true);
  const [ searchValue, setSearchValue ] = useState('');
  const [ selectedNESValues, setSelectedNESValues ] = useState([]);
  const [ data, setData ] = useState([]);
  const [ searchTerms, setSearchTerms ] = useState();
  const [ selectedRows, setSelectedRows ] = useState([]);
  const [ currentRow, setCurrentRow ] = useState();
  const [ gotoCurrentNode, setGotoCurrentNode ] = useState(true);
  const [ scrollToId, setScrollToId ] = useState();

  const classes = useBottomDrawerStyles();

  const openRef = useRef(false);
  openRef.current = open;

  const searchValueRef = useRef(searchValue);
  const sortFnRef = useRef(DEF_SORT_FN);

  const disabledRef = useRef(true);
  disabledRef.current = disabled;

  const lastSelectedRowsRef = useRef([]); // Will be used to clear the search only when selecting a node on the network
  const currentRowRef = useRef();
  currentRowRef.current = currentRow;
  
  const cy = controller.cy;
  const cyEmitter = new EventEmitterProxy(cy);

  const getSelectedRows = (sortFn) => {
    const nodes = disabledRef.current ? null : cy.pathwayNodes(true);
    // Get unique objects/rows (by id)
    const map = new Map();
    if (nodes) {
      nodes.forEach(n => map.set(n.data('id'), toTableRow(n)));
    }
    // Convert the map values to array and sort it
    const arr = Array.from(map.values());

    return sortFn(arr);
  };

  const onNetworkSelection = () => {
    // Selected rows
    const selRows = getSelectedRows(sortFnRef.current);
    setSelectedRows(selRows);
    // NES values
    if (selRows.length > 0) {
      const nesValues = selRows.map(r => r.nes);
      setSelectedNESValues(nesValues);
    } else {
      setSelectedNESValues([]);
    }
    if (currentRowRef.current) {
      if (selRows.findIndex(r => r.id === currentRowRef.current.id) === -1) {
        setCurrentRow(null);
      }
    }
  };

  const updateData = () => {
    // Update table data
    const nodes = cy.pathwayNodes(); // ignore compound nodes!
    let data = toTableData(nodes);

    // Filter out pathways that don't match the search terms
    const searchTerms = searchValueRef.current ? searchValueRef.current.toLowerCase().trim().split(' ') : [];

    if (searchTerms.length > 0) {
      const filteredData = [];

      OUTER:
      for (const obj of data) {
        for (const term of searchTerms) {
          if (obj.name.toLowerCase().includes(term)) {
            filteredData.push(obj);
            continue OUTER;
          }
        }
      }

      data = filteredData;
    }

    setSearchTerms(searchTerms);
    setData(data);

    // Also update selection state
    onNetworkSelection();
  };
  
  const debouncedOnNetworkSelection = _.debounce(() => onNetworkSelection(), 200);
  const debouncedOnNetworkChange = _.debounce(() => {
    const newDisabled = !controller.isNetworkLoaded() || !controller.isPathwayListIndexed();
    if (newDisabled !== disabled) {
      setDisabled(newDisabled);
    }
    if (!newDisabled) {
      updateData();
    }
  }, 200);
  const debouncedBoxSelectHandler = _.debounce((target) => {
    // Scroll to the last box selected element
    setScrollToId(target.data('id'));
  }, 100);
  
  const search = (val) => {
    // Now execute the search
    const query = val.trim();
    if (query.length > 0) {
      // Unselect Cy elements first
      const selectedEles = cy.elements().filter(':selected');
      selectedEles.unselect();
      searchValueRef.current = val;
      setSearchValue(val);
    } else {
      searchValueRef.current = query;
      setSearchValue(query);
    }
    updateData();
  };
  const cancelSearch = () => {
    search('');
  };

  useEffect(() => {
    const onNetworkLoaded = () => debouncedOnNetworkChange();
    const onPathwayListIndexed = () => debouncedOnNetworkChange();
    controller.bus.on('networkLoaded', onNetworkLoaded);
    controller.bus.on('pathwayListIndexed', onPathwayListIndexed);
    return () => {
      controller.bus.removeListener('networkLoaded', onNetworkLoaded);
      controller.bus.removeListener('pathwayListIndexed', onPathwayListIndexed);
    };
  }, []);

  useEffect(() => {
    const clearSearch = _.debounce(() => {
      cancelSearch();
    }, 128);
    cyEmitter.on('add remove', debouncedOnNetworkChange);
    cyEmitter.on('select unselect', debouncedOnNetworkSelection);
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
        if (ele.group && ele.group() === 'nodes') { // Ignore clicks on edges and on the background!
          setScrollToId(ele.data('id'));
        }
      }
    });
    cyEmitter.on('boxselect', evt => {
      if (openRef.current && evt.target.group() === 'nodes' && !evt.target.isParent()) {
        debouncedBoxSelectHandler(evt.target);
      }
    });
    return () => {
      cyEmitter.removeAllListeners();
    };
  }, []);

  const onRowSelectionChange = (row, selected, preventGotoNode = false) => {
    if (selected) {
      lastSelectedRowsRef.current = selectedRows;
      cy.nodes(`[id = "${row.id}"]`).select();
      setGotoCurrentNode(!preventGotoNode);
      setCurrentRow(row);
    } else {
      cy.nodes(`[id = "${row.id}"]`).unselect();
      setCurrentRow(null);
    }
  };
  const onDataSort = (sortFn) => {
    sortFnRef.current = sortFn; // Save the current sort function for later use
  };

  const getSortedSelectedRows = () => {
    let rows = selectedRows;
    rows = rows.filter(a => data.some(b => a.id === b.id));
    return sortFnRef.current(rows);
  };
  const goToNewCurrentRow = (step) => {
    const rows = getSortedSelectedRows();
    if (rows.length > 0) {
      let idx = -1;
      if (!currentRow) {
        // Go to the first/last selected row
        idx = step > 0 ? 0 : rows.length - 1;
      } else {
        // Go to the next/previous selected row
        idx = rows.findIndex(r => r.id === currentRow.id);
        idx += step;
        if (idx >= rows.length) {
          idx -= rows.length;
        } else if (idx < 0) {
          idx += rows.length;
        }
      }
      if (idx >= 0) {
        var newCurrentRow = rows[idx];
        setGotoCurrentNode(true);
        setCurrentRow(newCurrentRow);
        setScrollToId(newCurrentRow.id);
      }
    }
  };

  const shiftDrawer = leftDrawerOpen && !isMobile && !isTablet; 
  const magNES = controller.style ? controller.style.magNES : undefined;
  const totalPathways = disabled ? 0 : data.length;
  const filteredSelectedRows = selectedRows.filter(a => data.some(b => a.id === b.id));
  const totalSelected = filteredSelectedRows.length;

  return (
    <Drawer
      className={clsx(classes.drawer, { [classes.drawerShift]: shiftDrawer })}
      variant="permanent"
      anchor="bottom"
      open={true} // It's always open here, but not expanded--don't confuse it with the 'open' state
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
          <Toolbar variant="dense" className={clsx(classes.toolbar, { [classes.toolbarOpen]: open })}>
          {!open && (
            <Typography display="block" variant="subtitle2" color="textPrimary">
              Pathways&nbsp;
            {totalPathways >= 0 && (
              <Typography display="inline" variant="body2" color="textSecondary">
                &nbsp;({!isMobile && totalSelected > 0 ? totalSelected + ' selected of ' : ''}{ totalPathways })
              </Typography>
            )}
            </Typography>
          )}
          {open && (
            <>
              <SelectionNavigator
                disabled={totalSelected === 0}
                onPrevious={() => goToNewCurrentRow(-1)}
                onNext={() => goToNewCurrentRow(1)}
              />
              <ToolbarDivider />
              <SearchBar
                style={{width: 294}}
                placeholder="Find pathways..."
                value={searchValue}
                onChange={search}
                onCancelSearch={cancelSearch}
              />
              
            </>
          )}
            <ToolbarDivider unrelated />
            <div className={classes.grow} />
          {!(open && isMobile) && magNES && (
            <Grid container direction="column" spacing={0} style={{minWidth: 40, maxWidth: 300, width: '100%', marginTop: 16}}>
              <Grid item>
                <UpDownLegend
                  values={selectedNESValues}
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
            <ToolbarDivider />
            <ToolbarButton
              title="Pathways"
              icon={open ? <CollapseIcon fontSize="large" /> : <ExpandIcon fontSize="large" />}
              edge="start"
              disabled={disabled}
              onClick={() => onToggle(!open)}
            />
          </Toolbar>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <PathwayTable
              visible={open}
              data={data}
              selectedRows={filteredSelectedRows}
              currentRow={currentRow}
              gotoCurrentNode={gotoCurrentNode}
              scrollToId={scrollToId}
              searchTerms={searchTerms}
              controller={controller}
              isMobile={isMobile}
              onRowSelectionChange={onRowSelectionChange}
              onDataSort={onDataSort}
            />
          </Collapse>
        </AppBar>
      </div>
    </Drawer>
  );
}
BottomDrawer.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
  open: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  isTablet: PropTypes.bool.isRequired,
  leftDrawerOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

//==[ ToolbarButton ]=================================================================================================

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

//==[ ToolbarDivider ]================================================================================================

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

//==[ SelectionNavigator ]============================================================================================

const useSelectionNavigatorStyles = makeStyles(() => ({
  root: {
    maxWidth: 24,
  },
  button: {
    minWidth: 24,
    maxWidth: 24,
    minHeight: 24,
    maxHeight: 24,
  },
}));

const SelectionNavigator = ({ disabled, onPrevious, onNext }) => {
  const classes = useSelectionNavigatorStyles();

  return (
    <div className={classes.root}>
      <Tooltip title="Previous Selection" placement="right">
        <span>
          <Button disabled={disabled} variant="text" className={classes.button} onClick={() => onPrevious && onPrevious()}>
            <KeyboardArrowUpIcon size="small" />
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Next Selection" placement="right">
        <span>
          <Button disabled={disabled} className={classes.button} onClick={() => onNext && onNext()}>
            <KeyboardArrowDownIcon size="small" />
          </Button>
        </span>
      </Tooltip>
    </div>
  );
};
SelectionNavigator.propTypes = {
  disabled: PropTypes.bool,
  onPrevious: PropTypes.func,
  onNext: PropTypes.func,
};

export default BottomDrawer;