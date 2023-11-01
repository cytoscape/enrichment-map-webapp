import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { CONTROL_PANEL_WIDTH } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import GeneListPanel from './gene-list-panel';

import { makeStyles } from '@material-ui/core/styles';

import { Box, Drawer, Grid, Typography, Toolbar, Tooltip } from '@material-ui/core';
import { FormControl, IconButton, Select, MenuItem, ListItemIcon, ListItemText } from '@material-ui/core';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import SearchBar from './search-bar';

import KeyboardArrowLeftIcon from '@material-ui/icons/KeyboardArrowLeft';
import { VennIntersectionIcon, VennUnionIcon } from '../svg-icons';


const setOperationOptions = {
  union: {
    label: 'Union',
    description: 'All genes in selected pathways',
    icon: (props) => <VennUnionIcon size="small" {...props} />,
  },
  intersection: {
    label: 'Intersection',
    description: 'Genes common to selected pathways',
    icon: (props) => <VennIntersectionIcon size="small" {...props} />,
  },
};

const sortOptions = {
  up: {
    label: 'Sort by RANK (from lowest to highest)',
    icon: <Typography>DOWN</Typography>,
    iteratees: ['rank', 'gene'],
    orders: ['asc', 'asc']
  },
  down: {
    label: 'Sort by RANK (from highest to lowest)',
    icon: <Typography>UP</Typography>,
    iteratees: ['rank', 'gene'],
    orders: ['desc', 'asc']
  },
};

const useStyles = makeStyles((theme) => ({
  drawer: {
    background: theme.palette.background.default,
    width: CONTROL_PANEL_WIDTH,
    flexShrink: 0,
    display: 'flex',
    flexFlow: 'column',
    height: '100%',
  },
  drawerPaper: {
    width: CONTROL_PANEL_WIDTH,
    background: theme.palette.background.default,
    borderRight: `1px solid ${theme.palette.divider}`,
  },
  drawerHeader: {
    flex: '0 1 auto',
  },
  drawerControls: {
    borderTop: `1px solid ${theme.palette.divider}`,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: theme.spacing(1),
    paddingLeft: theme.spacing(2.5),
    paddingRight: theme.spacing(2.5),
  },
  drawerContent: {
    flex: '1 1 auto',
    overflowY: 'auto',
    borderColor: theme.palette.divider,
    borderWidth: '1px',
    borderStyle: 'solid solid hidden hidden',
    borderRadius: 4,
  },
  toolbar: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(0.5),
    minHeight: 50,
  },
  title: {
    paddingLeft: theme.spacing(0.5),
  },
  grow: {
    flexGrow: 1,
  },
  hideButton: {
    width: 41,
    height: 41,
  },
  setOperationSelect: {
    height: 40,
    width: 77,
  },
  setOperationIcon: {
    minWidth: 48,
  },
  sortButton: {
    width: 77,
  },
  geneList: {
    overflowY: "auto",
  },
}));

const LeftDrawer = ({ controller, open, isMobile, onHide }) => {
  const [networkLoaded, setNetworkLoaded] = useState(false);
  const [geneListIndexed, setGeneListIndexed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [genes, setGenes] = useState(null);
  const [setOperation, setSetOperation] = useState('union');
  const [sort, setSort] = useState('down');

  const searchValueRef = useRef();
  searchValueRef.current = searchValue;

  const setOperationRef = useRef(setOperation);
  setOperationRef.current = setOperation;

  const sortRef = useRef(sort);
  sortRef.current = sort;

  const cy = controller.cy;
  const cyEmitter = new EventEmitterProxy(cy);

  const classes = useStyles();

  const sortGenes = (genes, sort) => {
    const args = sortOptions[sort];
    return _.orderBy(genes, args.iteratees, args.orders);
  };

  const fetchGeneList = async (geneSetNames, intersection = false) => {
    const res = await controller.fetchGeneList(geneSetNames, intersection);
    const genes = res ? res.genes : [];

    return genes;
  };

  const fetchAllRankedGenes = async (intersection = false) => {
    return await fetchGeneList([], intersection);
  };

  const fetchGeneListFromElements = async (eles, intersection = false) => {
    const genes = [];
    const nodes = eles.nodes();

    const getNames = n => {
      const name = n.data('name');
      return Array.isArray(name) ? name : name.split(',');
    };

    // Fetch genes from nodes
    let gsNames = [];

    for (const el of nodes) {
      // Ignore compound nodes
      if (el.isParent()) {
        continue;
      }
      gsNames = gsNames.concat(getNames(el));
    }
    
    if (gsNames.length > 0) {
      gsNames = _.uniq(gsNames);
      const nodeGenes = await fetchGeneList(gsNames, intersection);
      genes.push(...nodeGenes);
    }
    
    // Remove duplicates
    const unique = _.uniqBy(genes, 'gene');

    return unique;
  };

  const debouncedSelectionHandler = _.debounce(async () => {
    const eles = cy.nodes(':childless:selected');
    const intersection = setOperationRef.current === 'intersection';

    if (eles.length > 0) {
      setGenes(null);
      if (eles.length === 1) {
        setSort(eles[0].data('NES') < 0 ? 'up' : 'down');
      }
      const genes = await fetchGeneListFromElements(eles, intersection);
      setGenes(sortGenes(genes, sortRef.current));
    } else if (searchValueRef.current == null || searchValueRef.current.trim() === '') {
      setGenes(null);
      const genes = await fetchAllRankedGenes(intersection);
      setGenes(sortGenes(genes, sortRef.current));
    }
  }, 250);

  const onNetworkLoaded = () => {
    setNetworkLoaded(true);
  };
  const onGeneListIndexed = () => {
    setGeneListIndexed(true);
    debouncedSelectionHandler();
  };

  const onCySelectionChanged = () => {
    debouncedSelectionHandler();
  };

  const cancelSearch = () => {
    setSearchValue('');
    setSearchResult(null);
  };
  const search = (val) => {
    const query = val.trim();
    
    if (query.length > 0) {
      setSetOperation('union');
      // Unselect Cy elements first
      const selectedEles = cy.elements().filter(':selected');
      selectedEles.unselect();
      // Now execute the search
      const res = controller.searchGenes(query);
      setSearchValue(val);
      setSearchResult(res);
    } else {
      cancelSearch();
    }
  };

  useEffect(() => {
    controller.bus.on('networkLoaded', onNetworkLoaded);
    controller.bus.on('geneListIndexed', onGeneListIndexed);

    const container = document.getElementById('cy');
    cy.mount(container);
    cy.resize();

    const clearSearch = _.debounce(() => {
      cancelSearch();
    }, 128);
    
    cyEmitter.on('select unselect', onCySelectionChanged);
    cyEmitter.on('select', () => clearSearch());

    return function cleanup() {
      cyEmitter.removeAllListeners();
      controller.bus.removeListener('networkLoaded', onNetworkLoaded);
      controller.bus.removeListener('geneListIndexed', onGeneListIndexed);
    };
  }, []);

  useEffect(() => {
    if (searchResult != null) {
      setGenes(sortGenes(searchResult, sortRef.current));
    } else {
      debouncedSelectionHandler();
    }
  }, [searchResult]);

  const handleGeneSetOption = async (evt) => {
    const value = evt.target.value;
    cancelSearch();
    setSetOperation(value);
    const eles = cy.nodes(':childless:selected');
    const intersection = value === 'intersection';
    if (eles.length > 0) {
      const genes = await fetchGeneListFromElements(eles, intersection);
      setGenes(sortGenes(genes, sortRef.current));
    } else {
      const genes = await fetchAllRankedGenes(intersection);
      setGenes(sortGenes(genes, sortRef.current));
    }
  };
  const handleSort = (evt, value) => {
    if (value != null) {
      setSort(value);
      setGenes(sortGenes(genes, value));
    }
  };

  const totalGenes = genes != null ? genes.length : -1;
  const setOperationsDisabled = searchValue != null && searchValue !== '';
  const sortDisabled = totalGenes <= 0;
  
  const drawerVariant = isMobile ? 'temporary' : 'persistent';

  return (
    <Drawer
      className={classes.drawer}
      variant={drawerVariant}
      anchor="left"
      open={open}
      PaperProps={{
        style: {
          overflow: "hidden"
        }
      }}
      classes={{
        paper: classes.drawerPaper,
      }}
    >
        <div className={classes.drawerHeader}>
          <Toolbar variant="dense" className={classes.toolbar}>
            <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title}>
              Genes&nbsp;
            {totalGenes >= 0 && (
              <Typography display="inline" variant="body2" color="textSecondary">
                ({ totalGenes })
              </Typography>
            )}
            </Typography>
            <div className={classes.grow} />
            <IconButton className={classes.hideButton} onClick={onHide}>
              <KeyboardArrowLeftIcon fontSize="large" />
            </IconButton>
          </Toolbar>
          <Grid container direction="column" spacing={2} className={classes.drawerControls}>
            <Grid item style={{padding: 0}}>
              <SearchBar
                disabled={!networkLoaded || !geneListIndexed}
                style={{
                  minWidth: 276,
                  maxWidth: 294,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
                placeholder="Find genes..."
                value={searchValue}
                onChange={search}
                onCancelSearch={cancelSearch}
              />
            </Grid>
            <Grid item>
              <Grid container direction="row" justifyContent="space-between" alignItems="center">
                <Grid item>
                  <FormControl variant="filled" size="small" disabled={setOperationsDisabled}>
                    <Select
                      variant="outlined"
                      disabled={setOperationsDisabled}
                      value={setOperation}
                      displayEmpty
                      onChange={handleGeneSetOption}
                      className={classes.setOperationSelect}
                      renderValue={(value) => {
                        return (
                          <Box sx={{ display: "flex", gap: 1 }}>
                            { setOperationOptions[value].icon({color: setOperationsDisabled ? 'disabled' : 'secondary'}) }
                          </Box>
                        );
                      }}
                    >
                    {Object.entries(setOperationOptions).map(([k, { label, description, icon }]) => (
                      <MenuItem key={k} value={k}>
                        <ListItemIcon className={classes.setOperationIcon}>{ icon({color: 'secondary'}) }</ListItemIcon>
                        <ListItemText primary={label} secondary={description} />
                      </MenuItem>
                    ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item>
                  <ToggleButtonGroup
                    value={sort}
                    exclusive
                    onChange={handleSort}
                  >
                  {Object.entries(sortOptions).map(([k, { label, icon }]) => (
                    <ToggleButton
                      key={`sort-${k}`}
                      value={k}
                      disabled={sortDisabled}
                      size="small"
                      className={classes.sortButton}
                    >
                      <Tooltip arrow placement="top" title={label}>
                        { icon }
                      </Tooltip>
                    </ToggleButton>
                  ))}
                  </ToggleButtonGroup>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </div>
        <div className={classes.drawerContent}>
        {networkLoaded && geneListIndexed && (
          <GeneListPanel
            controller={controller}
            genes={genes}
            sort={sort}
            isSearch={searchResult && searchResult !== ''}
            isIntersection={setOperation === 'intersection'}
            isMobile={isMobile}
          />
        )}
      </div>
    </Drawer>
  );
};

LeftDrawer.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
  open: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
};

export default LeftDrawer;