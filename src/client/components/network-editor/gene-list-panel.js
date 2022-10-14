import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { NetworkEditorController } from './controller';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import theme from '../../theme';

import { makeStyles } from '@material-ui/core/styles';

import { List, ListSubheader, ListItem, ListItemText } from '@material-ui/core';
import { Grid, Typography, Link, Divider, Tooltip } from '@material-ui/core';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import Skeleton from '@material-ui/lab/Skeleton';
import HSBar from "react-horizontal-stacked-bar-chart";

import SortByAlphaIcon from '@material-ui/icons/SortByAlpha';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import DoubleArrowIcon from '@material-ui/icons/DoubleArrow';

const CHART_WIDTH = 160;
const CHART_HEIGHT = 14;

const RANK_RANGE_COLOR = theme.palette.background.focus;
const UP_RANK_COLOR = '#f1a340';
const DOWN_RANK_COLOR = '#998ec3';
// (rank colors from: https://colorbrewer2.org/#type=diverging&scheme=PuOr&n=3)

const linkoutProps = { target: "_blank",  rel: "noreferrer", color: "textSecondary", underline: "hover" };

const orderBy = {
  alpha: { iteratees: ['gene'],       orders: ['asc'] },
  up:    { iteratees: ['rank', 'gene'], orders: ['asc', 'asc'] },
  down:  { iteratees: ['rank', 'gene'], orders: ['desc', 'asc'] },
};

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
    fontSize: '16px',
    color: theme.palette.divider,
  },
  geneName: {
    marginLeft: '0.5em',
    '&:hover': {
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
  const cy = controller.cy;

  const [clusterName, setClusterName] = useState(null);
  const [geneSetNames, setGeneSetNames] = useState([]);
  const [genes, setGenes] = useState([]);
  const [sort, setSort] = useState('down');

  const sortRef = useRef(sort);
  sortRef.current = sort;

  const classes = useStyles();

  const sortGenes = (genes, sort) => {
    const args = orderBy[sort];
    return _.orderBy(genes, args.iteratees, args.orders);
  };

  const fetchGeneList = async (geneSetNames) => {
    const res = await controller.fetchGeneList(geneSetNames);
    const genes = res ? res.genes : [];
    setGenes(sortGenes(genes, sortRef.current));
  };

  const fetchAllRankedGenes = async () => {
    fetchGeneList([]);
  };

  const fetchGeneListFromNodeOrEdge = async (ele) => {
    const gsNames = [];
    let cName = null;
    const getNames = ele => ele.data('name').split(',');

    if (ele.group() === 'nodes') {
      const children = ele.children();
     
      if (children.length > 0) { // Compound node (cluster)...
        cName = ele.data('name');
        children.forEach(n => gsNames.push(...getNames(n)));
      } else { // Regular node (gene set)...
        gsNames.push(...getNames(ele));
      }
    } else if (ele.group() === 'edges') {
      // Edge (get overlapping genes)...
      gsNames.push(...getNames(ele.source()));
      gsNames.push(...getNames(ele.target()));
    }
    
    console.log(gsNames);

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
      const eles = cy.$(':selected');

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
    const cyEmitter = new EventEmitterProxy(cy);

    controller.bus.on('geneListIndexed', onGeneListIndexed);
    cyEmitter.on('select unselect', onCySelectionChanged);

    if (controller.isGeneListIndexed()) {
      if (searchResult) {
        setClusterName(null);
        setGeneSetNames([]);
        setGenes(sortGenes(searchResult, 'alpha'));
        setSort('alpha');
      } else {
        debouncedSelectionHandler();
      }
    }

    return function cleanup() {
      cyEmitter.removeAllListeners();
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

    return (
      <ListItem key={idx} alignItems="flex-start">
        <ListItemText
          primary={
            <Grid container direction="row" justifyContent="space-between" alignItems='center'>
              <Grid item>
                <Grid container direction="row" justifyContent="flex-start" alignItems='center'>
                  <DoubleArrowIcon className={classes.listItemtemIcon} />
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

  const handleSort = (evt, value) => {
    if (value != null) {
      setSort(value);
      setGenes(sortGenes(genes, value));
    }
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
            <Grid container direction="row" justifyContent="space-between" alignItems='center'>
              <Grid item>
                <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title}>
                  Genes&nbsp;
                  <Typography display="inline" variant="body2" color="textSecondary">
                    ({!searchResult && totalGenes === 0 ? <em>loading...</em> : totalGenes})
                  </Typography>
                  :
                </Typography>
              </Grid>
              <Grid item>
                <ToggleButtonGroup
                  value={sort}
                  exclusive
                  onChange={handleSort}
                >
                  <ToggleButton value="alpha">
                    <Tooltip arrow placement="top" title="Sort by gene NAME">
                      <SortByAlphaIcon />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="up">
                    <Tooltip arrow placement="top" title="Sort by RANK (from lowest to highest)">
                      <KeyboardArrowUpIcon />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="down">
                    <Tooltip arrow placement="top" title="Sort by RANK (from highest to lowest)">
                      <KeyboardArrowDownIcon />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            </Grid>
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
