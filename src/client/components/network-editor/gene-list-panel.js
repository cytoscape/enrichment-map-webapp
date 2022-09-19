import React, { useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { NetworkEditorController } from './controller';
import theme from '../../theme';

import { makeStyles } from '@material-ui/core/styles';

import { List, ListSubheader, ListItem, ListItemText } from '@material-ui/core';
import { Grid, Typography, Divider } from '@material-ui/core';
import { Tooltip } from '@material-ui/core';
import HSBar from "react-horizontal-stacked-bar-chart";

const CHART_WIDTH = 160;
const CHART_HEIGHT = 14;

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
    width: CHART_WIDTH,
    padding: '0 8px',
  },
}));

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
  }, []);

  // Get the min and max rank values
  let minRank = 0, maxRank = 0;

  for (var i = 0; i < genes.length; i++) {
    const rank = genes[i].rank;

    if (rank) {
      minRank = Math.min(minRank, rank);
      maxRank = Math.max(maxRank, rank);
    }
  }

  const renderRow = (gene, rank, idx) => {
    let data;

    if (rank) {
      data = [];
      const desc = 'rank: ' + Math.round(rank * 100) / 100;
      
      if (rank < 0) {
        if (minRank < 0 && minRank !== rank) {
          data.push({ value: -(minRank - rank), color: theme.palette.background.focus, description: desc });
        }
        data.push({ value: -rank, color: theme.palette.action.disabled, description: desc });
        if (maxRank > 0) {
          data.push({ value: maxRank, color: theme.palette.background.focus, description: desc });
        }
      } else {
        if (minRank < 0) {
          data.push({ value: -minRank, color: theme.palette.background.focus, description: desc });
        }
        data.push({ value: rank, color: theme.palette.text.disabled, description: desc });
        if (maxRank > 0 && maxRank !== rank) {
          data.push({ value: (maxRank - rank), color: theme.palette.background.focus, description: desc });
        }
      }
    }

    return (
      <div key={idx}>
        <ListItem alignItems="flex-start" className={classes.geneItem}>
          <ListItemText
            primary={
              <Grid container direction="row" justifyContent="space-between" alignItems='center'>
                <Grid item>
                    <Typography display="inline" variant="body2" color="textPrimary">{gene}</Typography>
                </Grid>
                <Grid item className={classes.chartContainer}>
                  {data && (
                    <HSBar data={data} height={CHART_HEIGHT} />
                  )}
                </Grid>
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
