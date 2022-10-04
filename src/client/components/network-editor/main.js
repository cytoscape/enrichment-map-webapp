import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { CONTROL_PANEL_WIDTH } from './defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import SearchField from './search-field';
import GeneListPanel from './gene-list-panel';
import StyleLegend from './legend';

import { withStyles } from '@material-ui/core/styles';

import { Drawer, List, Typography } from '@material-ui/core';
import MuiAccordion from '@material-ui/core/Accordion';
import MuiAccordionSummary from '@material-ui/core/AccordionSummary';
import MuiAccordionDetails from '@material-ui/core/AccordionDetails';

import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

const LEGEND_HEADER_HEIGHT = 48;
const LEGEND_CONTENT_HEIGHT = 160;

export class Main extends Component {

  constructor(props) {
    super(props);

    this.controller = this.props.controller;
    this.cy = this.controller.cy;
    this.cyEmitter = new EventEmitterProxy(this.cy);
  }

  componentDidMount() {
    const container = document.getElementById('cy');
    this.cy.mount(container);
    this.cy.resize();

    // function randomArg(...args) {
    //   return args[Math.floor(Math.random() * args.length)];
    // }
    // this.eh = this.controller.eh = this.cy.edgehandles({
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

    this.updateSelectionClass = _.debounce(() => {
      const allEles = this.cy.elements();
      const selectedEles = allEles.filter(':selected');
      const unselectedEles = allEles.subtract(selectedEles);

      this.cy.batch(() => {
        if (allEles.length === unselectedEles.length) {
          allEles.removeClass('unselected');
        } else {
          selectedEles.removeClass('unselected');
          unselectedEles.addClass('unselected');
        }
      });
    }, 64);

    this.cyEmitter.on('select', () => {
      this.updateSelectionClass();
    }).on('unselect', () => {
      this.updateSelectionClass();
    }).on('remove', () => {
      this.updateSelectionClass();
    });
  }

  componentWillUnmount() {
    this.cyEmitter.removeAllListeners();
  }

  render() {
    const { controller } = this;
    const { classes, showControlPanel, drawerVariant, onContentClick } = this.props;
    
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
              <SearchField controller={controller} />
            </header>
            <section className={classes.drawerSection}>
              <List className={classes.geneList}>
                <GeneListPanel controller={controller} />
              </List>
            </section>
            <footer className={classes.drawerFooter}>
              <Legend defaultExpanded>
                <LegendSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Legend</Typography>
                </LegendSummary>
                <LegendDetails>
                  <StyleLegend controller={controller} width={CONTROL_PANEL_WIDTH - 1} height={LEGEND_CONTENT_HEIGHT} />
                </LegendDetails>
              </Legend>
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
  }
}

class NetworkBackground extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bgColor: 'white',
    };
    this.busProxy = new EventEmitterProxy(this.props.controller.bus);
  }

  componentDidMount() {
    this.busProxy.on('setNetworkBackgroundColor', (color) => this.setState({ bgColor: color }));
  }

  componentWillUnmount() {
    this.busProxy.removeAllListeners();
  }

  render() {
    const { bgColor } = this.state;

    return (
      <div id="cy-background" style={{ backgroundColor: bgColor }} />
    );
  }
}

const useStyles = theme => ({
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
});

NetworkBackground.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
};
Main.propTypes = {
  classes: PropTypes.object.isRequired,
  controller: PropTypes.instanceOf(NetworkEditorController),
  showControlPanel: PropTypes.bool.isRequired,
  drawerVariant: PropTypes.string.isRequired,
  onContentClick: PropTypes.func.isRequired,
};

export default withStyles(useStyles)(Main);