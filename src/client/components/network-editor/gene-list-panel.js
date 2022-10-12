import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { NetworkEditorController } from './controller';
import theme from '../../theme';

import { makeStyles } from '@material-ui/core/styles';

import { List, ListSubheader, ListItem, ListItemText } from '@material-ui/core';
import { Grid, Typography, Link, Divider } from '@material-ui/core';
import Skeleton from '@material-ui/lab/Skeleton';
import HSBar from "react-horizontal-stacked-bar-chart";

import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';

const CHART_WIDTH = 180;
const CHART_HEIGHT = 14;

const RANK_RANGE_COLOR = theme.palette.background.focus;
const UP_RANK_COLOR = '#f1a340';
const DOWN_RANK_COLOR = '#998ec3';
// (rank colors from: https://colorbrewer2.org/#type=diverging&scheme=PuOr&n=3)

const linkoutProps = { target: "_blank",  rel: "noreferrer", color: "textSecondary", underline: "always" };

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
  listItemtemIcon: {
    cursor: 'pointer',
  },
  geneName: {
    '&:hover': {
      textDecoration: 'none',
      color: theme.palette.primary.light,
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
  linkout: {
    fontSize: '0.9em',
  }
}));

export function GeneListPanel({ controller, searchResult }) {
  const [clusterName, setClusterName] = useState(null);
  const [geneSetNames, setGeneSetNames] = useState([]);
  const [genes, setGenes] = useState([]);
  const [selectedGene, setSelectedGene] = useState(0);
  const [geneDescription, setGeneDescription] = useState(0);
  
  const classes = useStyles();

  const fetchGeneList = async (geneSetNames) => {
    const res = await controller.fetchGeneList(geneSetNames);
    const genes = res ? res.genes : [];

    setGenes(genes);
  };

  const fetchAllRankedGenes = async () => {
    fetchGeneList([]);
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

    if (controller.isGeneListIndexed()) {
      const eles = controller.cy.$(':selected');

      if (eles.length > 0) {
        fetchGeneListFromNodeOrEdge(eles[eles.length - 1]);
      } else {
        fetchAllRankedGenes();
      }
    }
  }, 250);

  const onGeneListIndexed = () => {
    debouncedSelectionHandler();
  };

  const onCySelectionChanged = () => {
    debouncedSelectionHandler();
  };

  useEffect(() => {
    controller.bus.on('geneListIndexed', onGeneListIndexed);
    controller.cy.on('select unselect', onCySelectionChanged);

    if (controller.isGeneListIndexed()) {
      if (searchResult) {
        setClusterName(null);
        setGeneSetNames([]);
        setGenes(searchResult);
      } else {
        debouncedSelectionHandler();
      }
    }

    return function cleanup() {
      controller.cy.removeListener('select unselect', onCySelectionChanged);
      controller.bus.removeListener('geneListIndexed', onGeneListIndexed);
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
      setGeneDescription(null);

      if (selectedGene === name) {
        return;
      }

      setGeneDescription(
        <>
          <Link
            href={`https://www.ncbi.nlm.nih.gov/gene?term=(${name}%5BGene%20Name%5D)%20AND%209606%5BTaxonomy%20ID%5D`}
            className={classes.linkout}
            {...linkoutProps}
          >
            NCBI Gene
          </Link>
          <Link
            href={`https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${name}`}
            className={classes.linkout}
            style={{marginLeft: '2em', marginRight: '2em'}}
            {...linkoutProps}
          >
            Ensembl
          </Link>
          <Link
            href={`http://genemania.org/search/human/${name}`}
            className={classes.linkout}
            {...linkoutProps}
          >
            GeneMANIA
          </Link>
        </>
      );
    };

    const isSelected = selectedGene === name;

    return (
      <ListItem key={idx} alignItems="flex-start">
        <ListItemText
          primary={
            <Grid container direction="row" justifyContent="space-between" alignItems='center'>
              <Grid item onClick={() => toggleGeneDetails(name)}>
                <Grid container direction="row" justifyContent="flex-start" alignItems='center'>
                  { isSelected ?
                    <KeyboardArrowDownIcon fontSize="small" className={classes.listItemtemIcon} />
                  :
                    <KeyboardArrowRightIcon fontSize="small" className={classes.listItemtemIcon} />
                  }
                  <Link component="button" variant="body2" color="textPrimary" className={classes.geneName}>
                    {name}
                  </Link>
                </Grid>
              </Grid>
              <Grid item className={classes.chartContainer}>
                {data && (
                  <HSBar data={data} height={CHART_HEIGHT} />
                )}
              </Grid>
            </Grid>
          }
          secondary={isSelected && (
            <Typography variant="body2" color="textSecondary" className={classes.geneDesc}>
              { geneDescription ? geneDescription : 'Loading...' }
            </Typography>
          )}
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

  const totalGenes = genes.length;
  const emptySearchResult = searchResult != null && searchResult.length === 0;

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
              Genes&nbsp;
              <Typography display="inline" variant="body2" color="textSecondary">
                ({!searchResult && totalGenes === 0 ? <em>loading...</em> : totalGenes})
              </Typography>
              :
            </Typography>
            <Divider />
          </ListSubheader>
        }
      >
        {totalGenes > 0 || emptySearchResult ?
          genes.map(({gene, rank}, idx) => renderGeneRow(gene, rank, idx))
        :
          _.range(0, 30).map((idx) => renderGeneSkeletonRow(idx))
        }
      </List>
    </div>
  );
}

GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  searchResult: PropTypes.array,
};

export default GeneListPanel;
