import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import _ from 'lodash';

import { CONTROL_PANEL_WIDTH } from './defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import CollapsiblePanel from './collapsible-panel';
import GeneListPanel from './gene-list-panel';
import GeneSetListPanel from './geneset-list-panel';
import StyleLegend from './legend';

import { makeStyles } from '@material-ui/core/styles';

import { Drawer, Paper, Grid, Typography, Tooltip } from '@material-ui/core';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';

import SearchBar from "material-ui-search-bar";

import SortByAlphaIcon from '@material-ui/icons/SortByAlpha';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';

const LEGEND_CONTENT_HEIGHT = 160;

const sortOptions = {
  alpha: {
    label: 'Sort by gene NAME',
    icon: <SortByAlphaIcon />,
    iteratees: ['gene'],
    orders: ['asc'] 
  },
  up: {
    label: 'Sort by RANK (from lowest to highest)',
    icon: <KeyboardArrowUpIcon />,
    iteratees: ['rank', 'gene'],
    orders: ['asc', 'asc']
  },
  down: {
    label: 'Sort by RANK (from highest to lowest)',
    icon: <KeyboardArrowDownIcon />,
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
  drawerFooter: {
    flex: '0 1 auto',
    width: CONTROL_PANEL_WIDTH,
  },
  searchBar: {
    borderColor: theme.palette.divider,
    borderWidth: '1px',
    borderStyle: 'hidden hidden solid hidden',
  },
  header: {
    padding: '0.5em',
  },
  geneList: {
    overflowY: "auto",
  },
  cy: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    background: '#fff',
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  cyShift: {
    width: `calc(100% - ${CONTROL_PANEL_WIDTH}px)`,
    marginLeft: CONTROL_PANEL_WIDTH,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
}));

const NetworkBackground = ({ controller }) => {
  const [bgColor, setBgColor] = useState('white');
  
  const busProxy = new EventEmitterProxy(controller.bus);

  useEffect(() => {
    busProxy.on('setNetworkBackgroundColor', (color) => setBgColor(color));

    return function cleanup() {
      busProxy.removeAllListeners();
    };
  }, []);
  
  return <div id="cy-background" style={{ backgroundColor: bgColor }} />;
};

const Main = ({ controller, showControlPanel, drawerVariant, onContentClick }) => {
  const [networkLoaded, setNetworkLoaded] = useState(false);
  const [geneListIndexed, setGeneListIndexed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [geneSetNames, setGeneSetNames] = useState([]);
  const [genes, setGenes] = useState(null);
  const [sort, setSort] = useState('down');
  const [selectedGene, setSelectedGene] = useState(null);
  const [geneSetsExpanded, setGeneSetsExpanded] = useState(true);
  const [legendExpanded, setLegendExpanded] = useState(false);

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

  const fetchAllRankedGenes = async () => {
    fetchGeneList([]);
  };

  const fetchGeneListFromNodeOrEdge = async (ele) => {
    const gsNames = [];
    const getNames = ele => ele.data('name').split(',');

    if (ele.group() === 'nodes') {
      const children = ele.children();
     
      if (children.length > 0) { // Compound node (cluster)...
        children.forEach(n => gsNames.push(...getNames(n)));
      } else { // Regular node (gene set)...
        gsNames.push(...getNames(ele));
      }
    } else if (ele.group() === 'edges') {
      // Edge (get overlapping genes)...
      gsNames.push(...getNames(ele.source()));
      gsNames.push(...getNames(ele.target()));
    }
    
    if (gsNames.length > 0) {
      setGeneSetNames(gsNames);
      fetchGeneList(gsNames);
    }
  };

  const debouncedSelectionHandler = _.debounce(() => {
    const eles = cy.$(':selected');

    if (eles.length > 0) {
      setGeneSetNames([]);
      setGenes(null);
      fetchGeneListFromNodeOrEdge(eles[eles.length - 1]);
    } else if (searchValueRef.current == null || searchValueRef.current.trim() === '') {
      setGeneSetNames([]);
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

    const updateSelectionClass = _.debounce(() => {
      const allEles = cy.elements();
      const targetEle = allEles.filter(':selected'); // 1 ele
      const selectedEles = targetEle.isNode() ? targetEle.closedNeighborhood() : targetEle.add(targetEle.connectedNodes());
      const unselectedEles = allEles.subtract(selectedEles);

      cy.batch(() => {
        if (allEles.length === unselectedEles.length) {
          allEles.removeClass('unselected');
        } else {
          selectedEles.removeClass('unselected');
          unselectedEles.addClass('unselected');
        }
      });
    }, 64);

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
    });

    return function cleanup() {
      cyEmitter.removeAllListeners();
      controller.bus.removeListener('networkLoaded', onNetworkLoaded);
      controller.bus.removeListener('geneListIndexed', onGeneListIndexed);
    };
  }, []);

  useEffect(() => {
    if (searchResult != null) {
      setGeneSetNames([]);
      setGenes(sortGenes(searchResult, 'alpha'));
      setSort('alpha');
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

    return (
      <Grid container direction="row" justifyContent="space-between" alignItems='center' className={classes.header}>
        <Grid item>
          <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title}>
            Genes&nbsp;
            {totalGenes >= 0 && (
              <Typography display="inline" variant="body2" color="textSecondary">
                 ({ totalGenes })
              </Typography>
            )}
          </Typography>
        </Grid>
        <Grid item>
          <ToggleButtonGroup
            value={sort}
            exclusive
            onChange={handleSort}
          >
            {Object.entries(sortOptions).map(([k, { label, icon }]) => (
              <ToggleButton key={k} value={k} disabled={sortDisabled} size="small">
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

  const LeftDrawer = () => {
    return (
      <Drawer
        className={classes.drawer}
        variant={drawerVariant}
        anchor="left"
        open={showControlPanel}
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
          <header className={classes.drawerHeader}>
            <Paper component="form" className={classes.root}>
              <SearchBar
                autoFocus
                disabled={!networkLoaded || !geneListIndexed}
                className={classes.searchBar}
                value={searchValue}
                onChange={val => search(val)}
                onCancelSearch={() => cancelSearch()}
              />
            </Paper>
            <GeneListHeader />
          </header>
          <section className={classes.drawerSection}>
            {networkLoaded && geneListIndexed && (
              <GeneListPanel controller={controller} genes={genes} selectedGene={selectedGene} setSelectedGene={setSelectedGene} />
            )}
          </section>
          <footer className={classes.drawerFooter}>
            {geneSetNames.length > 0 && (
              <CollapsiblePanel title="Gene Sets" defaultExpanded={geneSetsExpanded} onChange={(evt, b) => setGeneSetsExpanded(b)}>
                <GeneSetListPanel geneSetNames={geneSetNames} />
              </CollapsiblePanel>
            )}
            {networkLoaded && (
              <CollapsiblePanel title="Legend" defaultExpanded={legendExpanded} onChange={(evt, b) => setLegendExpanded(b)}>
                <StyleLegend controller={controller} width={CONTROL_PANEL_WIDTH - 1} height={LEGEND_CONTENT_HEIGHT} />
              </CollapsiblePanel>
            )}  
          </footer>
        </div>
      </Drawer>
    );
  };
    
  const shiftCy = showControlPanel && drawerVariant === 'persistent';

  return (
    <div
      className="network-editor-content"
      onClick={onContentClick}
    >
      <LeftDrawer />
      <div className={classes.cy}>
        <div className={clsx(classes.cy, { [classes.cyShift]: shiftCy })}>
          <div id="cy" className={classes.cy} />
          <NetworkBackground controller={controller} />
        </div>
      </div>
    </div>
  );
};

NetworkBackground.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
};
Main.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
  showControlPanel: PropTypes.bool.isRequired,
  drawerVariant: PropTypes.string.isRequired,
  onContentClick: PropTypes.func.isRequired,
};

export default Main;