import React, { useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { NetworkEditorController } from './controller';
import theme from '../../theme';

import { makeStyles } from '@material-ui/core/styles';

import { List, ListSubheader, ListItem, ListItemText } from '@material-ui/core';
import { Grid, Typography, Divider } from '@material-ui/core';
import { Tooltip } from '@material-ui/core';
import { Bar } from 'react-chartjs-2';

const useStyles = makeStyles((theme) => ({
  title: {
    fontWeight: 'bold',
  },
  description: {
    paddingLeft: '0.75em',
  },
  geneItem : {
    paddingTop: 2,
    paddingBottom: 2,
  },
  chartContainer: {
    width: 160,
    height: 17,
    padding: '1px 0 0 0',
    borderLeftWidth: 1,
    borderLeftColor: theme.palette.text.disabled,
    borderLeftStyle: 'solid',
  },
}));

const chartOptions = {
  indexAxis: 'y',
  barThickness: 12,
  scales: {
    x: {
      type: 'linear',
      ticks: {
        display: false,
      },
      grid: {
        display: false,
        drawBorder: false,
      },
      stacked: true,
      display: false,
    },
    y: {
      ticks: {
        display: false,
      },
      grid: {
        display: false,
        drawBorder: false,
      },
      stacked: true,
      display: false,
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: false,
    },
  },
};

const chartProps = {
  width: 160,
  height: 16,
};

export function GeneListPanel({ controller }) {
  const [state, setState] = useReducer(
    (state, newState) => ({...state, ...newState}),
    {
      geneSet: null, // for when a geneset node is selected
      genes: [], // for when the search field is used
    }
  );
  const { geneSet, genes } = state;

  const classes = useStyles();

  const fetchGeneList = async (geneSetName) => {
    const geneSet = await controller.fetchGeneList(geneSetName);
    const genes = geneSet ? geneSet.genes : [];
    setState({ geneSet, genes });
  };

  const selectionHandler = (event) => {
    const node = event.target;
    const geneSetName = node.data('name');
    fetchGeneList(geneSetName);
  };
  const unselectionHandler = () => {
    const eles = controller.cy.nodes(':selected');

    if (eles.length === 0) {
      // fetchAllGenes();
      setState({ geneSet: null, genes: [] });
    }
  };

  useEffect(() => {
    controller.cy.on('select', 'node', selectionHandler);
    controller.cy.on('unselect', 'node', unselectionHandler);

    const eles = controller.cy.nodes(':selected');
    
    if (eles.length > 0) {
      const geneSetName = eles[0].data('name');
      fetchGeneList(geneSetName);
    }

    return function cleanup() {
      controller.cy.removeListener('select', 'node', selectionHandler);
      controller.cy.removeListener('unselect', 'node', unselectionHandler);
    };
  }, []); // Pass an empty array as the 2nd arg to make it only run on mount and unmount, thus stopping any infinite loops!

  const getMaxRank = () => {
    let max = 0;

    for (var i = 0; i < genes.length; i++) {
      if (genes[i].rank) {
        max = Math.max(max, genes[i].rank);
      }
    }

    return max;
  };

  const maxRank = getMaxRank();

  const renderRow = (gene, rank, idx) => {
    return (
      <div key={idx}>
        <ListItem alignItems="flex-start" className={classes.geneItem}>
          <ListItemText
            primary={
              <Grid
                container
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Grid item>
                  <Typography display="inline" variant="body2" color="textPrimary">{gene}</Typography>
                </Grid>
                <Tooltip
                  title={
                    <span style={{fontSize: '1.5em'}}>
                      rank:&nbsp;&nbsp;<b>{isNaN(rank) ? '---' : (Math.round(rank * 100) / 100)}</b>
                    </span>
                  }
                  hidden={isNaN(rank)}
                  arrow
                  placement="right-end"
                >
                  <Grid item className={classes.chartContainer}>
                    {rank && (
                      <Bar
                        data={{
                          labels: [rank],
                          datasets: [{
                            data: [rank],
                            fill: true,
                            borderWidth: 0,
                            backgroundColor: theme.palette.action.disabled,
                          }, {
                            data: [maxRank - rank],
                            backgroundColor: theme.palette.background.focus,
                          }],
                        }}
                        options={chartOptions}
                        {...chartProps}
                      />
                    )}
                  </Grid>
                </Tooltip>
              </Grid>
            }
            // secondary={
            //   "TODO: Gene description..."
            // }
          />
        </ListItem>
        {/* <Divider /> */}
      </div>
    );
  };

  return (
    <div>
      {geneSet && (
        <>
          <div style={{padding: '0 0.25em 0.5em 0.5em'}}>
              <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title} gutterBottom>
                Gene Set:
              </Typography>
              <Typography display="block" variant="body2" color="textPrimary" className={classes.description} gutterBottom>
                {geneSet.name}
              </Typography>
              <Typography display="block" variant="body2" color="textSecondary" className={classes.description} gutterBottom>
                = {geneSet.description}
              </Typography>
          </div>
          <Divider />
        </>
      )}
      {genes.length > 0 && (
        <List
          style={{padding: '0.5em 0'}}
          subheader={
            <ListSubheader component="div">
              <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title} gutterBottom>
                Genes <Typography display="inline" variant="body2" color="textSecondary">({genes.length})</Typography>:
              </Typography>
              <Divider />
            </ListSubheader>
          }
        >
          { genes.map(({gene, rank}, idx) => renderRow(gene, rank, idx) )}
        </List>
      )}
    </div>
  );
}

GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
};

export default GeneListPanel;
