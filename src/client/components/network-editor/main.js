import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import _ from 'lodash';

import { CONTROL_PANEL_WIDTH } from './defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import GeneListPanel from './gene-list-panel';
import StyleLegend from './legend';

import { makeStyles, withStyles } from '@material-ui/core/styles';

import { Drawer, Paper, List, Typography } from '@material-ui/core';
import MuiAccordion from '@material-ui/core/Accordion';
import MuiAccordionSummary from '@material-ui/core/AccordionSummary';
import MuiAccordionDetails from '@material-ui/core/AccordionDetails';
import SearchBar from "material-ui-search-bar";

import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

const LEGEND_HEADER_HEIGHT = 48;
const LEGEND_CONTENT_HEIGHT = 160;

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
    borderColor: theme.palette.divider,
    borderWidth: '2px',
    borderStyle: 'hidden hidden solid hidden',
  },
  drawerSection: {
    flex: '1 1 auto', overflowY: 'auto',
  },
  drawerFooter: {
    flex: '0 1 auto',
    width: CONTROL_PANEL_WIDTH,
    borderColor: theme.palette.divider,
    borderWidth: '1px',
    borderStyle: 'solid solid hidden hidden',
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
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [networkLoaded, setNetworkLoaded] = useState(false);
  const [geneListIndexed, setGeneListIndexed] = useState(false);

  const cy = controller.cy;
  const cyEmitter = new EventEmitterProxy(cy);

  const classes = useStyles();

  const cancelSearch = () => {
    setSearchValue('');
    setSearchResult(null);
  };
  const search = (val) => {
    const query = val.trim();

    if (val.length > 0) {
      const res = controller.searchGenes(query);
      setSearchValue(val);
      setSearchResult(res);
    } else {
      cancelSearch();
    }
  };

  const onNetworkLoaded = () => {
    setNetworkLoaded(true);
  };
  const onGeneListIndexed = () => {
    setGeneListIndexed(true);
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
      const selectedEles = allEles.filter(':selected');
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

    cyEmitter.on('select', () => {
      updateSelectionClass();
      clearSearch();
    }).on('unselect', () => {
      updateSelectionClass();
    }).on('remove', () => {
      updateSelectionClass();
    });

    return function cleanup() {
      controller.bus.removeListener('networkLoaded', onNetworkLoaded);
      controller.bus.removeListener('geneListIndexed', onGeneListIndexed);
      cyEmitter.removeAllListeners();
    };
  }, []);

  const Legend = withStyles({
    root: {
      boxShadow: 'none',
      '&:before': {
        display: 'none',
      },
      '&$expanded': {
        margin: 0,
        padding: 0,
      },
    },
    expanded: {},
  })(MuiAccordion);

  const LegendSummary = withStyles({
    root: {
      minHeight: LEGEND_HEADER_HEIGHT,
      '&$expanded': {
        minHeight: LEGEND_HEADER_HEIGHT,
      },
    },
    content: {
      '&$expanded': {
        margin: 0,
        padding: 0,
      },
    },
    expanded: {},
  })(MuiAccordionSummary);

  const LegendDetails = withStyles({
    root: {
      padding: 0,
      margin: 0,
    },
  })(MuiAccordionDetails);

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
                className={classes.input}
                value={searchValue}
                onChange={val => search(val)}
                onCancelSearch={() => cancelSearch()}
              />
            </Paper>
          </header>
          <section className={classes.drawerSection}>
            <List className={classes.geneList}>
              {networkLoaded && geneListIndexed && (
                <GeneListPanel controller={controller} searchResult={searchResult} />
              )}
            </List>
          </section>
          <footer className={classes.drawerFooter}>
            {networkLoaded && (
              <Legend defaultExpanded>
                <LegendSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Legend</Typography>
                </LegendSummary>
                <LegendDetails>
                  <StyleLegend controller={controller} width={CONTROL_PANEL_WIDTH - 1} height={LEGEND_CONTENT_HEIGHT} />
                </LegendDetails>
              </Legend>
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