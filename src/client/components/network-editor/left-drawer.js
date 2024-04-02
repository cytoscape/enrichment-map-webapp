import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { HEADER_HEIGHT, LEFT_DRAWER_WIDTH } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import GeneListPanel from './gene-list-panel';

import { makeStyles } from '@material-ui/core/styles';

import { Box, Drawer, Grid, Typography, Toolbar, Tooltip } from '@material-ui/core';
import { FormControl, IconButton, Select, MenuItem, ListItemIcon, ListItemText } from '@material-ui/core';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import SearchBar from './search-bar';

import KeyboardArrowLeftIcon from '@material-ui/icons/KeyboardArrowLeft';
import CloseIcon from '@material-ui/icons/Close';
import { DownloadIcon, VennIntersectionIcon, VennUnionIcon } from '../svg-icons';


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
  root: {
    background: theme.palette.background.default,
    width: LEFT_DRAWER_WIDTH,
    flexShrink: 0,
    display: 'flex',
    flexFlow: 'column',
    height: '100%',
    // Disable Text Selection (needed here as well because the Drawer can be 'temporary', rendered as a Dialog):
    WebkitTouchCallout: 'none', /* iOS Safari */
    WebkitUserSelect: 'none', /* Safari */
    MozUserSelect: 'none', /* Firefox */
    msUserSelect: 'none', /* Internet Explorer/Edge */
    userSelect: 'none', /* Non-prefixed version (Chrome and Opera) */
    // -----------------------
  },
  paper: {
    width: LEFT_DRAWER_WIDTH,
    background: theme.palette.background.default,
    borderRight: `1px solid ${theme.palette.divider}`,
  },
  header: {
    flex: '0 1 auto',
  },
  controls: {
    borderTop: `1px solid ${theme.palette.divider}`,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: theme.spacing(1),
    paddingLeft: theme.spacing(2.5),
    paddingRight: theme.spacing(2.5),
  },
  content: {
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
    minHeight: HEADER_HEIGHT,
  },
  title: {
    paddingLeft: theme.spacing(0.5),
  },
  grow: {
    flexGrow: 1,
  },
  closeButton: {
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

const LeftDrawer = ({ controller, open, isMobile, isTablet, onClose }) => {
  const [networkLoaded, setNetworkLoaded] = useState(false);
  const [geneListIndexed, setGeneListIndexed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [genes, setGenes] = useState(null);
  const [setOperation, setSetOperation] = useState('union');
  const [sort, setSort] = useState('down');
  const [selectedGene, setSelectedGene] = useState(null);
  const [initialIndex, setInitialIndex] = useState(-1); // -1 means "do NOT change the scroll position"

  const searchValueRef = useRef();
  searchValueRef.current = searchValue;

  const setOperationRef = useRef(setOperation);
  setOperationRef.current = setOperation;

  const sortRef = useRef(sort);
  sortRef.current = sort;

  const selectedGeneRef = useRef(selectedGene);
  selectedGeneRef.current = selectedGene;

  const cy = controller.cy;
  const cyEmitter = new EventEmitterProxy(cy);

  const classes = useStyles();

  const sortGenes = (list, sort) => {
    const args = sortOptions[sort];
    return _.orderBy(list, args.iteratees, args.orders);
  };

  const fetchGeneList = async (geneSetNames, intersection = false) => {
    const res = await controller.fetchGeneList(geneSetNames, intersection);
    const newGenes = res || [];
    return newGenes;
  };

  const fetchAllRankedGenes = async (intersection = false) => {
    return await fetchGeneList([], intersection);
  };

  const getGeneSetNames = (eles) => {
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

    return _.uniq(gsNames);
  };

  const fetchGeneListFromElements = async (eles, intersection = false) => {
    const newGenes = [];
    const gsNames = getGeneSetNames(eles);
    
    if (gsNames.length > 0) {
      const nodeGenes = await fetchGeneList(gsNames, intersection);
      newGenes.push(...nodeGenes);
    }
    
    const unique = _.uniqBy(newGenes, 'gene'); // Remove duplicates
    return unique;
  };

  const debouncedSelectionHandler = _.debounce(async () => {
    const eles = cy.pathwayNodes(true);
    if (eles.length < 2) {
      setSetOperation('union');
    }
    const intersection = setOperationRef.current === 'intersection';
    if (eles.length > 0) {
      // The sorting must be the same as the colour of the selection (one or more nodes),
      // but only if all the nodes in the selection are the same colour
      let hasPositive = false;
      let hasNegative = false;
      for (let i = 0; i < eles.length; i++) {
        const nes = eles[i].data('NES');
        if (nes > 0) {
          hasPositive = true;
        } else if (nes < 0) {
          hasNegative = true;
        }
        if (hasPositive && hasNegative)
          break;
      }
      if (hasPositive && !hasNegative) {
        setSort('down');
      } else if (hasNegative && !hasPositive) {
        setSort('up');
      }
      // Update the sorted gene list
      const newGenes = await fetchGeneListFromElements(eles, intersection);
      setGenes(sortGenes(newGenes, sortRef.current));
    } else if (_.isEmpty(searchValueRef.current)) {
      const newGenes = await fetchAllRankedGenes(intersection);
      setGenes(sortGenes(newGenes, sortRef.current));
    }
  }, 250);

  const handleGeneListExport = () => {
    const selected = cy.nodes(':selected').length > 0; // any selected nodes?
    const eles = cy.pathwayNodes(selected);
    const gsNames = getGeneSetNames(eles);
    controller.exportController.exportGeneList(genes, gsNames);
  };

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

  const updateCyHighlights = _.debounce((symbol) => {
    let nodes;
    if (symbol != null) {
      nodes = cy.pathwayNodes().filter(n => {
        for (const gene of n.data('genes')) {
          if (symbol === gene)
            return true;
        }
        return false;
      });
    }
    controller.highlightElements(nodes);
  }, 200);

  const toggleGeneDetails = async (symbol) => {
    const newSymbol = selectedGeneRef.current !== symbol ? symbol : null;
    updateCyHighlights(newSymbol);
    setSelectedGene(newSymbol);
    if (newSymbol != null)
      setInitialIndex(-1); // Make sure the scroll position doesn't change!
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
    cyEmitter.on('tap', evt => {
      if (evt.target === cy && selectedGeneRef.current != null) {
        // Tapping the network background should collapse the selected gene and clear the highlight
        toggleGeneDetails(selectedGeneRef.current);
      }
    });

    return function cleanup() {
      cyEmitter.removeAllListeners();
      controller.bus.removeListener('networkLoaded', onNetworkLoaded);
      controller.bus.removeListener('geneListIndexed', onGeneListIndexed);
    };
  }, []);

  useEffect(() => {
    if (searchResult != null) {
      setGenes(sortGenes(searchResult, sortRef.current));
    } else if (geneListIndexed) {
      debouncedSelectionHandler();
    }
  }, [searchResult]);

  useEffect(() => {
    // Check whether the previously selected gene is in the new 'genes' list
    if (genes != null && selectedGeneRef.current != null) {
      let idx = _.findIndex(genes, g => g.gene === selectedGeneRef.current);
      if (idx >= 0) {
        // Scroll to the previously selected gene
        if (idx > 1) idx--; // if this gene is not the first in the list, make sure it doesn't look like it is
        setInitialIndex(idx);
      } else {
        // Collapses and deselect a gene if it's not contained in the new 'genes' list.
        toggleGeneDetails(selectedGeneRef.current);
        // And reset the scroll
        setInitialIndex(0);
      }
    }
  }, [genes]);

  useEffect(() => {
    if (genes != null)
      setInitialIndex(0); // Always reset the scroll when sorting has changed
  }, [sort]);

  const handleGeneSetOption = async (evt) => {
    const value = evt.target.value;
    cancelSearch();
    setSetOperation(value);
    const eles = cy.pathwayNodes(true);
    const intersection = value === 'intersection';
    if (eles.length > 0) {
      const newGenes = await fetchGeneListFromElements(eles, intersection);
      setGenes(sortGenes(newGenes, sortRef.current));
    } else {
      const newGenes = await fetchAllRankedGenes(intersection);
      setGenes(sortGenes(newGenes, sortRef.current));
    }
  };
  const handleSort = (evt, value) => {
    if (value != null) {
      setSort(value);
      setGenes(sortGenes(genes, value));
    }
  };

  const selectedPathways = cy.pathwayNodes(true);
  const isSearch = !_.isEmpty(searchValue);
  const setOperationsDisabled = isSearch || selectedPathways.length < 2;
  const totalGenes = genes != null ? genes.length : -1;
  const sortDisabled = totalGenes <= 0;
  
  const drawerVariant = isMobile || isTablet ? 'temporary' : 'persistent';
  
  // The 'keepMounted' property is only available when variant="temporary"
  // (keep it mounted so the GeneListPanel component can keep its state when closed)
  const drawerProps = {
    ...(drawerVariant === 'temporary' && { keepMounted: true })
  };

  // Change title according to node selection
  let title = 'All Genes';
  if (isSearch) {
    title = 'Search Results';
  } else if (selectedPathways.length > 0) {
    title = 'Genes in Selection';
  }

  return (
    <Drawer
      className={classes.root}
      variant={drawerVariant}
      anchor="left"
      open={open}
      {...drawerProps}
      PaperProps={{
        style: {
          overflow: "hidden"
        }
      }}
      classes={{
        paper: classes.paper,
      }}
    >
        <div className={classes.header}>
          <Toolbar variant="dense" className={classes.toolbar}>
            <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title}>
              { title }&nbsp;
            {totalGenes >= 0 && (
              <>
                <Typography display="inline" variant="body2" color="textSecondary">
                  ({ totalGenes })
                </Typography> &nbsp;&nbsp;
                <Tooltip title="Download Current Gene List">
                  <IconButton size="small" onClick={handleGeneListExport}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
            </Typography>
            <div className={classes.grow} />
            <IconButton className={classes.closeButton} onClick={onClose}>
              { drawerVariant === 'temporary' ? <CloseIcon /> : <KeyboardArrowLeftIcon fontSize="large" /> }
            </IconButton>
          </Toolbar>
          <Grid container direction="column" spacing={2} className={classes.controls}>
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
                            { setOperationOptions[value].icon({color: setOperationsDisabled ? 'disabled' : 'primary'}) }
                          </Box>
                        );
                      }}
                    >
                    {Object.entries(setOperationOptions).map(([k, { label, description, icon }]) => (
                      <MenuItem key={k} value={k}>
                        <ListItemIcon className={classes.setOperationIcon}>{ icon({color: 'primary'}) }</ListItemIcon>
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
                      <Tooltip placement="top" title={label}>
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
        <div className={classes.content}>
        {networkLoaded && geneListIndexed && (
          <GeneListPanel
            controller={controller}
            genes={genes}
            selectedGene={selectedGene}
            initialIndex={initialIndex}
            isSearch={isSearch}
            isIntersection={setOperation === 'intersection'}
            isMobile={isMobile}
            onGeneClick={toggleGeneDetails}
          />
        )}
      </div>
    </Drawer>
  );
};

LeftDrawer.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  open: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  isTablet: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default LeftDrawer;