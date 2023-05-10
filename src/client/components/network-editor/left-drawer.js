import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { CONTROL_PANEL_WIDTH, DEFAULT_PADDING } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import GeneListPanel from './gene-list-panel';

import { makeStyles } from '@material-ui/core/styles';

import { Drawer, Grid, Typography, Tooltip } from '@material-ui/core';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import SearchBar from "material-ui-search-bar";

import { GeneSetIcon, VennIntersectionIcon } from '../svg-icons';
import NetworkIcon from '@material-ui/icons/Share';

const sortOptions = {
  down: {
    label: 'Sort by RANK (from highest to lowest)',
    icon: <Typography>UP</Typography>,
    iteratees: ['rank', 'gene'],
    orders: ['desc', 'asc']
  },
  up: {
    label: 'Sort by RANK (from lowest to highest)',
    icon: <Typography>DOWN</Typography>,
    iteratees: ['rank', 'gene'],
    orders: ['asc', 'asc']
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
  searchBar: {
    borderColor: theme.palette.divider,
    borderWidth: '1px',
    borderStyle: 'hidden hidden solid hidden',
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
    setGenes(sortGenes(genes, sortRef.current));
  };

  const fetchGeneListForEdge = async (geneSetNamesSource, geneSetNamesTarget) => {
    const resSource = await controller.fetchGeneList(geneSetNamesSource);
    const resTarget = await controller.fetchGeneList(geneSetNamesTarget);
    const genesSource = resSource ? resSource.genes : [];
    const genesTarget = resTarget ? resTarget.genes : [];
    const genesCommon = _.intersectionBy(genesSource, genesTarget, x => x.gene);
    setGenes(sortGenes(genesCommon, sortRef.current));
    setGenes(sortGenes(genesCommon, sortRef.current));
  };

  const fetchAllRankedGenes = async () => {
    fetchGeneList([]);
  };

  const fetchGeneListFromNodeOrEdge = async (ele) => {
    const getNames = ele => {
      const name = ele.data('name');
      return Array.isArray(name) ? name : name.split(',');
    };

    if (ele.group() === 'nodes') {
      const gsNames = [];
      const children = ele.children();
     
      if (children.length > 0) { // Compound node (cluster)...
        children.forEach(n => gsNames.push(...getNames(n)));
      } else { // Regular node (gene set)...
        gsNames.push(...getNames(ele));
      }

      fetchGeneList(gsNames);

    } else if (ele.group() === 'edges') {
      // Edge (get overlapping genes)...
      const gsNamesSource = [...getNames(ele.source())];
      const gsNamesTarget = [...getNames(ele.target())];

      fetchGeneListForEdge(gsNamesSource, gsNamesTarget);
    }
  };

  const debouncedSelectionHandler = _.debounce(() => {
    const eles = cy.$(':selected');

    if (eles.length > 0) {
      const ele = eles[eles.length - 1];
      setGenes(null);
      setSort(ele.data('NES') < 0 ? 'up' : 'down');
      fetchGeneListFromNodeOrEdge(ele);
    } else if (searchValueRef.current == null || searchValueRef.current.trim() === '') {
      setGenes(null);
      fetchAllRankedGenes();
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
    
    if (val.length > 0) {
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

    // function randomArg(...args) {
    //   return args[Math.floor(Math.random() * args.length)];
    // }
    // this.eh = controller.eh = cy.edgehandles({
    //   snap: true,
    //   edgeParams: () => ({
    //     // TODO temporary data
    //     data: {
    //       attr1: Math.random(), // betwen 0 and 1
    //       attr2: Math.random() * 2.0 - 1.0, // between -1 and 1
    //       attr3: randomArg("A", "B", "C")
    //     }
    //   })
    // });

    const animatedFit = eles => {
      cy.animate({
        fit: { eles: eles, padding: DEFAULT_PADDING },
        easing: 'ease-out',
        duration: 500
      });
    };
    
    const updateSelectionClass = () => {
      const allEles = cy.elements();
      const targetEle = allEles.filter(':selected'); // 1 ele
      const selectedEles = targetEle.isNode() ? targetEle : targetEle.add(targetEle.connectedNodes());
      const unselectedEles = allEles.subtract(selectedEles);

      cy.batch(() => {
        if (allEles.length === unselectedEles.length) {
          allEles.removeClass('unselected').removeClass('selected');
        } else {
          selectedEles.removeClass('unselected').addClass('selected');
          unselectedEles.addClass('unselected').removeClass('selected');
        }
      });

      if (!targetEle.empty()) {
        animatedFit(targetEle.component());
      }
    };

    const clearSearch = _.debounce(() => {
      cancelSearch();
    }, 128);

    cyEmitter.on('select unselect', onCySelectionChanged);

    cyEmitter.on('select', () => {
      updateSelectionClass();
      clearSearch();
    }).on('unselect', () => {
      updateSelectionClass();
    }).on('remove', () => {
      updateSelectionClass();
    }).on('tap', (e) => {
      const tappedOnBackground = e.target === cy;

      if (tappedOnBackground) {
        animatedFit(cy.elements());
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
          <Grid container direction="row" alignItems="center" spacing={1}>
            <Tooltip arrow placement="bottom" title={iconTooltip}>
              <Grid item style={{lineHeight: 0}}>
                <TitleIcon size="small" color="secondary" />
              </Grid>
            </Tooltip>
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
            <SearchBar
              disabled={!networkLoaded || !geneListIndexed}
              className={classes.searchBar}
              value={searchValue}
              onChange={search}
              onCancelSearch={cancelSearch}
            />
            <GeneListHeader />
          </div>
          <div className={classes.drawerSection}>
          {networkLoaded && geneListIndexed && (
            <GeneListPanel controller={controller} genes={genes} sort={sort} />
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