import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { NetworkEditorController } from './controller';
import theme from '../../theme';

import _ from 'lodash';

import { makeStyles } from '@material-ui/core/styles';

import { List, ListSubheader, ListItem, ListItemText } from '@material-ui/core';
import { Grid, Typography, Divider } from '@material-ui/core';
import Skeleton from '@material-ui/lab/Skeleton';
import HSBar from "react-horizontal-stacked-bar-chart";

const PRECISION = 4;

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
  header: {
    padding: '0 0.25em 0.25em 0',
  },
  clusterName: {
    textTransform: 'capitalize',
    paddingTop: '1.0em',
    paddingBottom: '1.0em',
    paddingLeft: '0.75em',
  },
  gsName: {
    textTransform: 'capitalize',
    paddingBottom: '0.5em',
  },
  chartContainer: {
    width: CHART_WIDTH,
    padding: '0 8px',
  },
}));

export function GeneListPanel({ controller }) {
  const [clusterName, setClusterName] = useState(null);
  const [geneSetNames, setGeneSetNames] = useState([]);
  const [genes, setGenes] = useState([]);
  const [minRank, setMinRank] = useState(0);
  const [maxRank, setMaxRank] = useState(0);
  
  const totalGenes = genes.length;
  let rankedGenes = genes.filter(g => g.rank);

  const classes = useStyles();

  const fetchGeneList = async (geneSetNames) => {
    const res = await controller.fetchGeneList(geneSetNames);
    const genes = res ? res.genes : [];
    const minRank = res ? res.minRank : 0;
    const maxRank = res ? res.maxRank : 0;
    setMinRank(minRank);
    setMaxRank(maxRank);
    setGenes(genes);
  };

  const fetchAllRankedGenes = async () => {
    // TODO: Better call another function/endpoint...
    fetchGeneList(null, []);
  };

  const fetchGeneListFromNodeOrEdge = async (ele) => {
    const gsNames = [];
    let cName = null;

    if (ele.group() === 'nodes') {
      const children = ele.children();
     
      if (children.length > 0) { // Compound node (cluster)...
        cName = ele.data('name');
        children.forEach(n => gsNames.push(n.data('name')));
      } else { // Regular node (gene set)...
        gsNames.push(ele.data('name'));
      }
    } else if (ele.group() === 'edges') {
      // Edge (get overlapping genes)...
      gsNames.push(ele.source().data('name'));
      gsNames.push(ele.target().data('name'));
    }
    
    setClusterName(cName);

    if (gsNames.length > 0) {
      setGeneSetNames(gsNames);
      fetchGeneList(gsNames);
    }
  };

  const debouncedSelectionHandler = _.debounce(() => {
    setClusterName(null);
    setGeneSetNames([]);
    setGenes([]);
    setMinRank(0);
    setMaxRank(0);

    const eles = controller.cy.$(':selected');

    if (eles.length > 0) {
      fetchGeneListFromNodeOrEdge(eles[eles.length - 1]);
    } else {
      fetchAllRankedGenes();
    }
  }, 250);

  const selectionHandler = () => {
    debouncedSelectionHandler();
  };

  useEffect(() => {
    controller.cy.on('select unselect', selectionHandler);
    debouncedSelectionHandler();

    return function cleanup() {
      controller.cy.removeListener('select unselect', selectionHandler);
    };
  }, []);

  const renderGeneSetRow = (gsName, idx) => {
    if (gsName.indexOf('%') >= 0) {
      gsName = gsName.substring(0, gsName.indexOf('%')).toLowerCase();
    }

    return (
      <ListItem key={idx} alignItems="flex-start">
        <ListItemText
          primary={
            <Typography display="inline" variant="body2" color="textPrimary" className={classes.gsName}>
              &#8226; {gsName}
            </Typography>
          }
        />
      </ListItem>
    );
  };

  const renderGeneRow = (gene, rank, idx) => {
    let data;

    if (rank) {
      data = [];
      const desc = 'rank: ' + rank; //rank.toFixed(PRECISION); // TODO: Should we round it?
      
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

  return (
    <div>
      {clusterName && (
        <div className={classes.header} style={{paddingLeft: '0.5em'}}>
          <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title} gutterBottom>
            Cluster:
          </Typography>
          <Typography display="block" variant="body2" color="textPrimary" className={classes.clusterName} gutterBottom>
            { clusterName }
          </Typography>
        </div>
      )}
      {!clusterName && geneSetNames.length > 0 && (
        <div className={classes.header}>
          <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title} style={{paddingLeft: '0.5em'}} gutterBottom>
            Gene Set{geneSetNames.length > 1 ? 's' : ''}:
          </Typography>
          <List>
            { geneSetNames.map((gsName, idx) => renderGeneSetRow(gsName, idx)) }
          </List>
        </div>
      )}
      {(clusterName || geneSetNames.length > 0) && (
        <Divider style={{marginBottom: '0.5em'}} />
      )}
      <List
        dense
        subheader={
          <ListSubheader component="div">
            <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title} gutterBottom>
              Ranked Genes&nbsp;
              <Typography display="inline" variant="body2" color="textSecondary">
                ({totalGenes > 0 ? `${rankedGenes.length} of ${totalGenes}` : (<em>loading...</em>)})
              </Typography>
              :
            </Typography>
            <Divider />
          </ListSubheader>
        }
      >
        {totalGenes > 0 ?
          rankedGenes.map(({gene, rank}, idx) => renderGeneRow(gene, rank, idx))
        :
          _.range(0, 30).map((idx) => renderGeneSkeletonRow(idx))
        }
      </List>
    </div>
  );
}

GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
};

export default GeneListPanel;
