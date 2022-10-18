import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { linkoutProps } from './defaults';
import theme from '../../theme';
import { NetworkEditorController } from './controller';

import { makeStyles } from '@material-ui/core/styles';

import { List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import { Grid, Typography, Link } from '@material-ui/core';
import Skeleton from '@material-ui/lab/Skeleton';
import HSBar from "react-horizontal-stacked-bar-chart";

import DoubleArrowIcon from '@material-ui/icons/DoubleArrow';

const CHART_WIDTH = 160;
const CHART_HEIGHT = 14;

const RANK_RANGE_COLOR = theme.palette.background.focus;
const UP_RANK_COLOR = '#f1a340';
const DOWN_RANK_COLOR = '#998ec3';
// (rank colors from: https://colorbrewer2.org/#type=diverging&scheme=PuOr&n=3)

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  chartContainer: {
    width: CHART_WIDTH,
    padding: '0 8px',
  },
  geneListItemIcon: {
    marginTop: 'auto',
    marginBottom: 'auto',
    minWidth: '24px',
  },
  bulletIcon: {
    fontSize: '0.875rem',
    color: theme.palette.divider,
  },
  geneName: {
    '&:hover': {
      color: theme.palette.link.main,
    }
  },
  geneDesc: {
    fontSize: '1.0em',
    marginTop: '0.25em',
    marginLeft: '0.6em',
    padding: '0.75em 0 0 0.75em',
    borderWidth: 1,
    borderColor: theme.palette.divider,
    borderStyle: 'hidden hidden hidden solid',
  },
}));

const GeneListPanel = ({ controller, genes }) => {
  const classes = useStyles();

  const renderGeneRow = (name, rank, idx) => {
    let data;

    if (rank) {
      data = [];
      const minRank = controller.minRank;
      const maxRank = controller.maxRank;
      const desc = 'rank: ' + rank;
      
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
      <ListItem key={idx} alignItems="flex-start">
        <ListItemIcon className={classes.geneListItemIcon}>
          <DoubleArrowIcon className={classes.bulletIcon} />
        </ListItemIcon>
        <ListItemText
          primary={
            <Grid container direction="row" justifyContent="space-between" alignItems='center'>
              <Grid item>
                <Link
                  href={`https://www.ncbi.nlm.nih.gov/gene?term=(${name}%5BGene%20Name%5D)%20AND%209606%5BTaxonomy%20ID%5D`}
                  variant="body2"
                  color="textPrimary"
                  className={classes.geneName}
                  {...linkoutProps}
                >
                  {name}
                </Link>
              </Grid>
              <Grid item className={classes.chartContainer}>
                {data && (
                  <HSBar data={data} height={CHART_HEIGHT} />
                )}
              </Grid>
            </Grid>
          }
        />
      </ListItem>
    );
  };

  const renderGeneSkeletonRow = (idx) => {
    let w = Math.round(Math.random() * 100);
    w = Math.min(60, Math.max(40, w));

    return (
      <ListItem key={idx} alignItems="flex-start">
        <ListItemText
          primary={
            <Grid container direction="row" justifyContent="space-between" alignItems='center'>
              <Grid item>
                <Typography display="inline" variant="body2" color="textPrimary">
                  <Skeleton variant="text" width={w} />
                </Typography>
              </Grid>
              <Grid item className={classes.chartContainer}>
                <Skeleton variant="rect" height={CHART_HEIGHT} />
              </Grid>
            </Grid>
          }
        />
      </ListItem>
    );
  };

  const totalGenes = genes != null ? genes.length : -1;

  return (
    <List dense className={classes.root}>
      {totalGenes >= 0 ?
        genes.map(({gene, rank}, idx) => renderGeneRow(gene, rank, idx))
      :
        _.range(0, 30).map((idx) => renderGeneSkeletonRow(idx))
      }
    </List>
  );
};

GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  genes: PropTypes.array,
};

export default GeneListPanel;