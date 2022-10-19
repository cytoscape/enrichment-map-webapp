import React, { useState } from 'react';
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

import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';

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
  listItem: {
    cursor: 'pointer',
    '&:hover': {
      color: theme.palette.link.main,
    }
  },
  bulletIcon: {
    marginRight: '4px',
    color: 'inherit',
  },
  geneName: {
    color: 'inherit',
  },
  chartContainer: {
    width: CHART_WIDTH,
    padding: '0 8px',
  },
  geneMetadata: {
    fontSize: '1.0em',
    marginTop: '0.25em',
    marginLeft: '0.6em',
    padding: '0.5em 1.2em 0 1.05em',
    borderWidth: 1,
    borderColor: theme.palette.divider,
    borderStyle: 'hidden hidden hidden solid',
  },
  linkout: {
    fontSize: '0.75rem',
    color: theme.palette.link.main,
  },
}));

const fetchGeneMetadata = async(symbol) => {
  try {
    const res = await fetch(`https://api.ncbi.nlm.nih.gov/datasets/v1/gene/symbol/${symbol}/taxon/9606`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!res.ok) {
      throw 'Unable to fetch gene metadata';
    }

    const data = await res.json();
    const gene = data.genes[0].gene;
    const geneId = gene['gene_id'];
    const description = gene.description;
    const md = { geneId, symbol, description };
    
    return md;
  } catch (error) {
    console.error(error);
    return { error };
  }
};

const GeneListPanel = ({ controller, genes }) => {
  const [selectedGene, setSelectedGene] = useState(0);
  const [geneMatadata, setGeneMatadata] = useState(0);
  
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

    const toggleGeneDetails = async (name) => {
      setSelectedGene(selectedGene !== name ? name : null);
      setGeneMatadata(null);

      if (selectedGene === name) {
        return;
      }

      const obj = await fetchGeneMetadata(name);
      console.log(obj);

      if (obj && !obj.error) {
        setGeneMatadata(
          <>
            <Grid item xs={12}>
            { obj.description }
            </Grid>
            <Grid item xs={12}>  
              <Grid container direction="row" justifyContent="space-between" alignItems='center'>
                <Grid item>
                  <Link
                    href={`https://www.ncbi.nlm.nih.gov/gene/${obj.geneId}`}
                    className={classes.linkout}
                    {...linkoutProps}
                  >
                    NCBI Gene
                  </Link>
                </Grid>
                <Grid item>
                  <Link
                    href={`https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${obj.geneId}`}
                    className={classes.linkout}
                    style={{marginLeft: '2em', marginRight: '2em'}}
                    {...linkoutProps}
                  >
                    Ensembl
                  </Link>
                </Grid>
                <Grid item>
                  <Link
                    href={`http://genemania.org/search/human/${name}`}
                    className={classes.linkout}
                    {...linkoutProps}
                  >
                    GeneMANIA
                  </Link>
                </Grid>
              </Grid>
            </Grid>
          </>
        );
      } else {
        setGeneMatadata(
          <span style={{color: theme.palette.error.main, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', height: '20px'}}>
            <ErrorOutlineIcon fontSize="small" style={{marginRight: '10px'}} /> Error: {obj.error.message ? obj.error.message : 'Unable to fetch description'}
          </span>
        );
      }
    };

    const isSelected = selectedGene === name;

    return (
      <ListItem key={idx} alignItems="flex-start">
        <ListItemText
          primary={
            <Grid container direction="column" alignItems='flex-start'>
                <Grid
                  container
                  direction="row"
                  justifyContent="space-between"
                  alignItems='center'
                  className={classes.listItem}
                  onClick={() => toggleGeneDetails(name)}
                >
                  <Grid item>
                    <Grid container direction="row" justifyContent="flex-start" alignItems='center'>
                      { isSelected ?
                        <KeyboardArrowDownIcon fontSize="small" className={classes.bulletIcon} />
                      :
                        <KeyboardArrowRightIcon fontSize="small" className={classes.bulletIcon} />
                      }
                      <Typography variant="body2" color="textPrimary" className={classes.geneName}>
                        {name}
                      </Typography>
                    </Grid>
                  </Grid>
                  <Grid item className={classes.chartContainer}>
                    {data && (
                      <HSBar data={data} height={CHART_HEIGHT} />
                    )}
                  </Grid>
                </Grid>
              {isSelected && (
                <Grid container color="textSecondary" className={classes.geneMetadata}>
                  { geneMatadata ? geneMatadata : 'Loading...' }
                </Grid>
              )}
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