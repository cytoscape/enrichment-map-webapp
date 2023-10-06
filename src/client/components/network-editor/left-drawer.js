import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import theme from '../../theme';
import { CONTROL_PANEL_WIDTH } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import GeneListPanel from './gene-list-panel';

import { makeStyles } from '@material-ui/core/styles';

import { Drawer, Grid, Typography, Tooltip } from '@material-ui/core';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import SearchBar from './search-bar';

import { GeneSetIcon, VennIntersectionIcon } from '../svg-icons';
import NetworkIcon from '@material-ui/icons/Share';

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
  },
  drawerContent: {
    display: 'flex',
    flexFlow: 'column',
    height: '100%',
  },
  drawerPaper: {
    width: CONTROL_PANEL_WIDTH,
    background: theme.palette.background.default,
  },
  drawerHeader: {
    flex: '0 1 auto',
  },
  drawerSection: {
    flex: '1 1 auto',
    overflowY: 'auto',
  },
  header: {
    padding: '0.5em',
  },
  title: {
    paddingLeft: theme.spacing(0.5),
  },
  geneList: {
    overflowY: "auto",
  },
}));

const LeftDrawer = ({ controller, open, isMobile }) => {
  const [networkLoaded, setNetworkLoaded] = useState(false);
  const [geneListIndexed, setGeneListIndexed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [genes, setGenes] = useState(null);
  const [sort, setSort] = useState('down');

  const searchValueRef = useRef(searchValue);
  searchValueRef.current = searchValue;

  const sortRef = useRef(sort);
  sortRef.current = sort;

  const cy = controller.cy;
  const cyEmitter = new EventEmitterProxy(cy);

  const classes = useStyles();

  const sortGenes = (genes, sort) => {
    const args = sortOptions[sort];
    return _.orderBy(genes, args.iteratees, args.orders);
  };

  const fetchGeneList = async (geneSetNames) => {
    const res = await controller.fetchGeneList(geneSetNames);
    const genes = res ? res.genes : [];

    return genes;
  };

  const fetchGeneListForEdge = async (geneSetNamesSource, geneSetNamesTarget) => {
    const genesSource = await fetchGeneList(geneSetNamesSource);
    const genesTarget = await fetchGeneList(geneSetNamesTarget);
    const genes = _.intersectionBy(genesSource, genesTarget, 'gene');

    return genes;
  };

  const fetchAllRankedGenes = async () => {
    return await fetchGeneList([]);
  };

  const fetchGeneListFromElements = async (eles) => {
    const genes = [];
    const nodes = eles.nodes();
    const edges = eles.edges();

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
      const nodeGenes = await fetchGeneList(gsNames);
      genes.push(...nodeGenes);
    }

    // Fetch genes from edges
    for (const el of edges) {
      // If both this edge's source and target nodes are selected,
      // we don't need to get the overlapping genes from the edge,
      // because we'll already get all the same genes from its nodes
      if (el.source().selected() && el.source().selected()) {
        continue;
      }

      // Edge (get overlapping genes)...
      const edgeGenes = await fetchGeneListForEdge(getNames(el.source()),  getNames(el.target()));
      genes.push(...edgeGenes);
    }
    
    // Remove duplicates
    const unique = _.uniqBy(genes, 'gene');

    return unique;
  };

  const debouncedSelectionHandler = _.debounce(async () => {
    const eles = cy.$(':selected');

    if (eles.length > 0) {
      setGenes(null);
      if (eles.length === 1) {
        setSort(eles[0].data('NES') < 0 ? 'up' : 'down');
      }
      const genes = await fetchGeneListFromElements(eles);
      setGenes(sortGenes(genes, sortRef.current));
    } else if (searchValueRef.current == null || searchValueRef.current.trim() === '') {
      setGenes(null);
      const genes = await fetchAllRankedGenes();
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

  const GeneListHeader = () => {
    const handleSort = (evt, value) => {
      if (value != null) {
        setSort(value);
        setGenes(sortGenes(genes, value));
      }
    };

    const totalGenes = genes != null ? genes.length : -1;
    const sortDisabled = totalGenes <= 0;

    const isNetEleSelected = cy.elements().filter(':selected').length > 0;
    const isIntersection = cy.elements().filter('edge:selected').length > 0;
    let iconTooltip = 'All Gene Sets';
    let TitleIcon = NetworkIcon;
    
    if (isNetEleSelected) {
      iconTooltip = isIntersection ? 'Intersection\u2014genes that are common to both gene sets' : 'Gene Set';
      TitleIcon = isIntersection ? VennIntersectionIcon : GeneSetIcon;
    }
    
    return (
      <Grid container direction="row" justifyContent="space-between" alignItems="center" className={classes.header}>
        <Grid item>
          <Tooltip arrow placement="bottom" title={iconTooltip}>
            <Grid container direction="row" alignItems="center" spacing={1}>
              <Grid item style={{lineHeight: 0}}>
                <TitleIcon size="small" color="secondary" />
              </Grid>
              <Grid>
                <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title}>
                  Genes&nbsp;
                {totalGenes >= 0 && (
                  <Typography display="inline" variant="body2" color="textSecondary">
                    ({ totalGenes })
                  </Typography>
                )}
                </Typography>
              </Grid>
            </Grid>
          </Tooltip>
        </Grid>
        <Grid item>
          <ToggleButtonGroup
            value={sort}
            exclusive
            onChange={handleSort}
          >
          {Object.entries(sortOptions).map(([k, { label, icon }]) => (
            <ToggleButton key={`sort-${k}`} value={k} disabled={sortDisabled} size="small" style={{width:70}}>
              <Tooltip arrow placement="top" title={label}>
                {icon}
              </Tooltip>
            </ToggleButton>
          ))}
          </ToggleButtonGroup>
        </Grid>
      </Grid>
    );
  };
  
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
        <div className={classes.drawerContent}>
          <div className={classes.drawerHeader}>
            <GeneListHeader />
            <SearchBar
              disabled={!networkLoaded || !geneListIndexed}
              style={{
                maxWidth: 276,
                marginTop: theme.spacing(1.5),
                marginBottom: theme.spacing(2),
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
              placeholder="Find genes..."
              value={searchValue}
              onChange={search}
              onCancelSearch={cancelSearch}
            />
          </div>
          <div className={classes.drawerSection}>
          {networkLoaded && geneListIndexed && (
            <GeneListPanel controller={controller} genes={genes} sort={sort} isMobile={isMobile} />
          )}
          </div>
        </div>
      </Drawer>
    );
};

LeftDrawer.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
  open: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default LeftDrawer;