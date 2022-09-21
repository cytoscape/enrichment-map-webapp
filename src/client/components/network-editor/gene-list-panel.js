import React, { useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { NetworkEditorController } from './controller';
import theme from '../../theme';

import _ from 'lodash';

import { makeStyles } from '@material-ui/core/styles';

import { List, ListSubheader, ListItem, ListItemText } from '@material-ui/core';
import { Grid, Typography, Divider } from '@material-ui/core';
import HSBar from "react-horizontal-stacked-bar-chart";

const CHART_WIDTH = 180;
const CHART_HEIGHT = 14;
const UP_RANK_COLOR = theme.palette.text.disabled;
const DOWN_RANK_COLOR = theme.palette.action.disabled;
const RANK_RANGE_COLOR = theme.palette.background.focus;

const useStyles = makeStyles((theme) => ({
  title: {
    fontWeight: 'bold',
  },
  description: {
    paddingLeft: '0.75em',
  },
  geneItem : {
    paddingTop: 0,
    paddingBottom: 0,
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
  const totalGenes = genes.length;
  let rankedGenes = genes.filter(g => g.rank);

  const classes = useStyles();

  const fetchGeneList = async (geneSetNames) => {
    const geneSet = await controller.fetchGeneList(geneSetNames);
    const genes = geneSet ? geneSet.genes : [];
    setState({ geneSet, genes });
  };

  const fetchGeneListFromNodeOrEdge = async (ele) => {
    if (ele.group() === 'nodes') {
      // TODO: get ranked genes from the selected cluster
      const gsName = ele.data('name');
      fetchGeneList([gsName]);
    } else if (ele.group() === 'edges') {
      const gsName1 = ele.source().data('name');
      const gsName2 = ele.target().data('name');
      fetchGeneList([gsName1, gsName2]);
    }
  };

  const selectionHandler = (event) => {
    const ele = event.target;
    fetchGeneListFromNodeOrEdge(ele);
  };
  const unselectionHandler = () => {
    const eles = controller.cy.$(':selected');

    if (eles.length === 0) {
      // fetchAllGenes();
      setState({ geneSet: null, genes: [] });
    }
  };

  useEffect(() => {
    controller.cy.on('select', selectionHandler);
    controller.cy.on('unselect', unselectionHandler);

    const eles = controller.cy.$(':selected');
    
    if (eles.length > 0) {
      fetchGeneListFromNodeOrEdge(eles[0]);
    }

    return function cleanup() {
      controller.cy.removeListener('select', selectionHandler);
      controller.cy.removeListener('unselect', unselectionHandler);
    };
  }, []);

  // Get the min and max rank values
  let minRank = 0, maxRank = 0;

  for (var i = 0; i < rankedGenes.length; i++) {
    const rank = rankedGenes[i].rank;

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
        // Low regulated genes
        if (minRank < 0 && minRank !== rank) {
          data.push({ value: -(minRank - rank), color: RANK_RANGE_COLOR, description: desc });
        }
        data.push({ value: -rank, color: DOWN_RANK_COLOR, description: desc });
        if (maxRank > 0) {
          data.push({ value: maxRank, color: RANK_RANGE_COLOR, description: desc });
        }
      } else {
        // Up regulated genes
        if (minRank < 0) {
          data.push({ value: -minRank, color: RANK_RANGE_COLOR, description: desc });
        }
        data.push({ value: rank, color: UP_RANK_COLOR, description: desc });
        if (maxRank > 0 && maxRank !== rank) {
          data.push({ value: (maxRank - rank), color: RANK_RANGE_COLOR, description: desc });
        }
      }
    }

    return (
      <React.Fragment key={idx}>
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
      </React.Fragment>
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
      {totalGenes > 0 && (
        <List
          style={{padding: '0.5em 0'}}
          subheader={
            <ListSubheader component="div">
              <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title} gutterBottom>
                Ranked Genes <Typography display="inline" variant="body2" color="textSecondary">({rankedGenes.length} of {totalGenes})</Typography>:
              </Typography>
              <Divider />
            </ListSubheader>
          }
        >
          { rankedGenes.map(({gene, rank}, idx) => renderRow(gene, rank, idx) )}
        </List>
      )}
    </div>
  );
}

GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
};

export default GeneListPanel;
