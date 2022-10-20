import React, { useState } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { useQuery } from "react-query";
import { linkoutProps } from './defaults';
import theme from '../../theme';
import { NetworkEditorController } from './controller';

import { makeStyles } from '@material-ui/core/styles';

import { List, ListItem, ListItemText } from '@material-ui/core';
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
  listItemText: {
    marginTop: 0,
    marginBottom: 0,
  },
  listItemHeader: {
    margin: 0,
    cursor: 'pointer',
    '&:hover': {
      color: theme.palette.link.main,
    },
    "&[disabled]": {
      color: theme.palette.divider,
      cursor: "default",
      "&:hover": {
        textDecoration: "none"
      }
    },
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
    marginLeft: '0.6em',
    padding: '0 1.2em 0 1.05em',
    borderWidth: 1,
    borderColor: theme.palette.divider,
    borderStyle: 'hidden hidden hidden solid',
  },
  geneRankCollapsed: {
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    color: theme.palette.text.disabled,
    marginTop: '-0.25em',
    paddingRight: '0.75em',
  },
  geneRankExpanded: {
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    textAlign: 'right',
    color: theme.palette.text.disabled,
    marginTop: '-0.25em',
    marginBottom: '0.75em',
    paddingRight: '0.05em',
  },
  linkout: {
    fontSize: '0.75rem',
    color: theme.palette.link.main,
  },
  loadingMsg: {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    color: theme.palette.text.disabled,
  },
  errorMsg: {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    color: theme.palette.error.main,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  }
}));

const GeneMetadataPanel = ({ symbol, rank }) => {
  const classes = useStyles();

  const query = useQuery(
    ['gene-metadata', symbol],
    () =>
      fetch(`https://api.ncbi.nlm.nih.gov/datasets/v1/gene/symbol/${symbol}/taxon/9606`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
    .then(res => res.json()),
    {
      retry: 2,
      retryDelay: 3000,
      staleTime: 24 * 3600000, // After 24 hours, the cached data becomes stale and a refetch can happen
    }
  );

  const data = query.data;
  const isLoading = query.isLoading;
  let error = query.error;

  let description, ncbiId, ensemblId;
  
  if (!isLoading && !error && data) {
    const entry = data.genes && data.genes.length > 0 ? data.genes[0] : {};

    if (entry.warnings && entry.warnings.length > 0) {
      error = { message: entry.warnings[0].reason };
    } else {
      const gene = entry.gene;

      if (gene) {
        description = gene.description;
        ncbiId = gene['gene_id'];
        
        const ensemblGeneIds = gene['ensembl_gene_ids'];
        ensemblId = ensemblGeneIds && ensemblGeneIds.length > 0 ? ensemblGeneIds[0] : null;
      }
    }
  }

  return (
    <Grid container color="textSecondary" className={classes.geneMetadata}>
      <Grid container direction="row" justifyContent="space-between" alignItems='center' className={classes.geneRankExpanded}>
        <Grid item>Rank: </Grid>
        <Grid item>{ rank }</Grid>
      </Grid>
      {isLoading && (
        <Typography variant="body2" className={classes.loadingMsg}>Loading...</Typography>
      )}
      {error && (
        <span className={classes.errorMsg}>
            <ErrorOutlineIcon fontSize="small" style={{marginRight: '10px'}} /> {error.message ? error.message : 'Unable to fetch description'}
        </span>
      )}
      {!error && description && (
        <Grid item xs={12}>
          <Typography variant="body2" color="textSecondary">{ description }</Typography>
        </Grid>
      )}
      <Grid item xs={12}>  
        <Grid container direction="row" justifyContent="space-between" alignItems='center'>
          <Grid item>
            <Link
              href={ncbiId ? `https://www.ncbi.nlm.nih.gov/gene/${ncbiId}` : `https://www.ncbi.nlm.nih.gov/gene?term=(${symbol}%5BGene%20Name%5D)%20AND%209606%5BTaxonomy%20ID%5D`}
              className={classes.linkout}
              {...linkoutProps}
            >
              NCBI Gene
            </Link>
          </Grid>
          <Grid item>
            <Link
              href={`https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${ensemblId ? ensemblId : symbol}`}
              className={classes.linkout}
              style={{marginLeft: '2em', marginRight: '2em'}}
              {...linkoutProps}
            >
              Ensembl
            </Link>
          </Grid>
          <Grid item>
            <Link
              href={`http://genemania.org/search/human/${symbol}`}
              className={classes.linkout}
              {...linkoutProps}
            >
              GeneMANIA
            </Link>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

const GeneListPanel = ({ controller, genes }) => {
  const [selectedGene, setSelectedGene] = useState(0);
  const classes = useStyles();

  const totalGenes = genes != null ? genes.length : -1;

  const toggleGeneDetails = async (symbol) => {
    setSelectedGene(selectedGene !== symbol ? symbol : null);
  };

  const renderGeneRow = ({ symbol, rank, idx }) => {
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

    const loading = totalGenes === -1;
    const isSelected = !loading && selectedGene === symbol;

    return (
      <ListItem key={idx} alignItems="flex-start">
        <ListItemText
          className={classes.listItemText}
          primary={
            <Grid container direction="column" alignItems='flex-start'>
              <Grid
                container
                direction="row"
                justifyContent="space-between"
                alignItems='center'
                disabled={loading}
                className={classes.listItemHeader}
                onClick={() => { if (!loading) toggleGeneDetails(symbol); }}
              >
                <Grid item>
                  <Grid container direction="row" justifyContent="flex-start" alignItems='center'>
                    {isSelected ?
                      <KeyboardArrowDownIcon fontSize="small" className={classes.bulletIcon} />
                    :
                      <KeyboardArrowRightIcon fontSize="small" className={classes.bulletIcon} />
                    }
                    <Typography variant="body2" color="textPrimary" className={classes.geneName}>
                      {loading ? <Skeleton variant="text" width={72} /> : symbol }
                    </Typography>
                  </Grid>
                </Grid>
                <Grid item className={classes.chartContainer}>
                  {loading ?
                    <Skeleton variant="rect" height={CHART_HEIGHT} />
                    :
                    data && <HSBar data={data} height={CHART_HEIGHT} />
                  }
                </Grid>
              </Grid>
              {isSelected ?
                <GeneMetadataPanel symbol={symbol} rank={rank} />
                :
                <Grid container direction="row" justifyContent="flex-end" alignItems='center' className={classes.geneRankCollapsed}>
                  {loading ? <Skeleton variant="text" width={115} /> : rank }
                </Grid>
              }
            </Grid>
          }
        />
      </ListItem>
    );
  };
  
  return (
    <List dense className={classes.root}>
      {totalGenes >= 0 ?
        genes.map(({gene, rank}, idx) => renderGeneRow({ symbol: gene, rank, idx }))
      :
        _.range(0, 30).map((idx) => renderGeneRow({ idx }))
      }
    </List>
  );
};

GeneMetadataPanel.propTypes = {
  symbol: PropTypes.string.isRequired,
  rank: PropTypes.number.isRequired,
};
GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  genes: PropTypes.array,
};

export default GeneListPanel;