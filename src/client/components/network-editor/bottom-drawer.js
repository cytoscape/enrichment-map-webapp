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
import { UpDownLegend } from './charts';

import { withStyles } from '@material-ui/core/styles';

import Collapse from '@material-ui/core/Collapse';
import { AppBar, Toolbar, Divider } from '@material-ui/core';
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

  const selNodeRef = useRef(null);

  const cy = controller.cy;
  const cyEmitter = new EventEmitterProxy(cy);

  const disabled = !networkLoaded || !pathwayListIndexed;
  const sel = disabled ? null : cy.nodes(":childless:selected");
  const selNode = (sel && sel.length === 1) ? sel[0] : null;
  const selectedId = selNode ? selNode.data('id') : null;

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

  const debouncedSelectionHandler = _.debounce(() => {
    const eles = cy.nodes(':selected');

    if (eles.length === 0) {
      setSelectedNES(null);
    } else if (eles.length === 1 && eles[0].group() === 'nodes') {
      const id = eles[0].data('id');
      if (!selNodeRef.current || selNodeRef.current.data('id') != id) {
        setSelectedNES(eles[0].data('NES'));
      }
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
    cyEmitter.on('add remove', onNetworkChanged);
    cyEmitter.on('select unselect', onCySelectionChanged);
    return () => {
      cyEmitter.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    const sel = cy.nodes(':selected');
    selNodeRef.current = sel.length === 1 ? sel[0] : null;
  }, [selectedId]);

  const handleOpenDrawer = (b) => {
    setOpen(b);
    onShowDrawer(b);
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
              style={{width: 276}}
              placeholder="Find pathways..."
              value={searchValue}
              onChange={search}
              onCancelSearch={cancelSearch}
            />
          )}
            <ToolbarDivider classes={classes} />
            <div className={classes.grow} />
          {!open && controller.style && (
            <UpDownLegend
              value={selectedNES}
              minValue={-controller.style.magNES}
              maxValue={controller.style.magNES}
              downColor={REG_COLOR_RANGE.downMax}
              zeroColor={REG_COLOR_RANGE.zero}
              upColor={REG_COLOR_RANGE.upMax}
              height={16}
              tooltip="Normalized Enrichment Score (NES)"
              style={{height: 16, minWidth: 40, maxWidth: 400, width: '100%'}}
            />
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
              initialSelectedId={selectedId}
              searchTerms={searchTerms}
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