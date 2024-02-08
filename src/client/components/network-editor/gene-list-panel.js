import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import _ from 'lodash';

import { useQuery } from "react-query";
import chroma from 'chroma-js';
import { linkoutProps } from '../defaults';
import theme from '../../theme';
import { REG_COLOR_RANGE } from './network-style';
import { NetworkEditorController } from './controller';
import { UpDownHBar } from './charts';

import { makeStyles, withStyles } from '@material-ui/core/styles';

import { Virtuoso } from 'react-virtuoso';
import { List, ListItem, ListItemText, ListItemIcon, ListSubheader } from '@material-ui/core';
import { Grid, Paper, Typography, Link, Tooltip } from '@material-ui/core';
import Skeleton from '@material-ui/lab/Skeleton';

import InfoIcon from '@material-ui/icons/Info';
import SadFaceIcon from '@material-ui/icons/SentimentVeryDissatisfied';
import KeyboardReturnIcon from '@material-ui/icons/KeyboardReturn';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import { VennUnionIcon } from '../svg-icons';


const CHART_WIDTH = 160;
const CHART_HEIGHT = 16;
const GENE_RANK_ROUND_DIGITS = 2;

/** Background color for hovering over selected elements */
const HOVER_SELECTION_BG =
  chroma(theme.palette.action.selected)
  .alpha(chroma(theme.palette.action.hover).alpha() + chroma(theme.palette.action.selected).alpha())
  .css();

const useGeneMetadataPanelStyles = makeStyles((theme) => ({
  geneName: {
    color: 'inherit', 
    whiteSpace:'nowrap', 
    overflow:'hidden', 
    textOverflow:'ellipsis'
  },
  geneMetadata: {
    fontSize: '1.0em',
    marginLeft: '0.6em',
    marginBottom: '0.25em',
    padding: '0.25em 1.2em 0 1.05em',
    borderWidth: 1,
    borderColor: theme.palette.divider,
    borderStyle: 'hidden hidden hidden solid',
  },
  linkout: {
    fontSize: '0.75rem',
  },
  loadingMsg: {
    color: theme.palette.text.disabled,
    animationName: '$blinker',
    animationDuration: '1000ms',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationTimingFunction: 'ease-in-out',
  },
  errorMsg: {
    color: theme.palette.error.main,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  '@keyframes blinker': {
    from: {
      opacity: 0.5,
    },
    to: {
      opacity: 0.25,
    },
  },
}));

const GeneMetadataPanel = ({ controller, symbol, showSymbol }) => {
  const classes = useGeneMetadataPanelStyles();

  const queryGeneData = useQuery(
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

  const queryNodes = useQuery(
    ['related-node-ids', symbol],
    () => fetch(`/api/${controller.cy.data('id')}/${symbol}/nodes`)
          .then(res => res.json())
          .then(res => res.nodeIDs),
    { retry: false }
  );

  const data = queryGeneData.data;
  const isLoading = queryGeneData.isLoading || queryNodes.isLoading;

  let error = queryGeneData.error;
  let description, ncbiId;
  
  if (!isLoading && !error && data) {
    const entry = data.genes && data.genes.length > 0 ? data.genes[0] : {};

    if (entry.warnings && entry.warnings.length > 0) {
      error = { message: entry.warnings[0].reason };
    } else {
      const gene = entry.gene;

      if (gene) {
        description = gene.description;
        ncbiId = gene['gene_id'];
      }
    }
  }

  return (
    <Grid container color="textSecondary" className={classes.geneMetadata}>
      { showSymbol && showSymbol() && (
        <Typography variant="body2" color="textPrimary" className={classes.geneName}>
          {symbol}
        </Typography>
      )}
      {error && (
        <span className={classes.errorMsg}>
            <ErrorOutlineIcon fontSize="small" style={{marginRight: '10px'}} />
            <Typography variant="body2">
              {error.message ? error.message : 'Unable to fetch description'}
            </Typography>
        </span>
      )}
      {!error && (
        <>
          <Grid item xs={12}>
            <Typography variant="body2" color="textSecondary" className={isLoading ? classes.loadingMsg : null}>
              {isLoading ? 'Loading...' : description }
            </Typography>
          </Grid>
          {!isLoading && (
            <>
              <Grid item xs={12}>  
                <Grid container direction="row" justifyContent="space-between" alignItems='center'>
                  <Grid item>
                    <Link
                      href={ncbiId ? `https://www.ncbi.nlm.nih.gov/gene/${ncbiId}` : `https://www.ncbi.nlm.nih.gov/gene?term=(${symbol}%5BGene%20Name%5D)%20AND%209606%5BTaxonomy%20ID%5D`}
                      className={classes.linkout}
                      {...linkoutProps}
                    >
                      More Info
                    </Link>
                  </Grid>
                  <Grid item>
                    <Link
                      href={`https://genemania.org/search/human/${symbol}`}
                      className={classes.linkout}
                      {...linkoutProps}
                    >
                      Related Genes
                    </Link>
                  </Grid>
                </Grid>
              </Grid>
            </>
          )}
        </>
      )}
    </Grid>
  );
};
GeneMetadataPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  symbol: PropTypes.string.isRequired,
  showSymbol: PropTypes.func
};


const useNoResultsBoxStyles = makeStyles((theme) => ({
  mainIcon: {
    fontSize: '4em',
    opacity: 0.4,
  },
  noResultsBox: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    padding: theme.spacing(2),
    textAlign: 'center',
  },
  noResultsInfoBox: {
    width: '100%',
    maxWidth: 360,
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: 16,
  },
  noResultsLine: {
    marginTop: theme.spacing(1),
  },
  noResultsSubheader: {
    lineHeight: '1.25em',
    textAlign: 'left',
    marginBottom: theme.spacing(2),
    color: theme.palette.text.disabled,
  },
  noResultsItem: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  noResultsItemIcon: {
    minWidth: 'unset',
  },
  noResultsItemIconIcon: {
    transform: 'scaleX(-1)',
    fontSize: '1em',
    marginRight: theme.spacing(1),
    color: theme.palette.text.disabled,
    opacity: 0.5,
  },
  noResultsItemText: {
    margin: 0,
    color: theme.palette.text.disabled,
  },
}));

const NoResultsBox = ({ isSearch }) => {
  const classes = useNoResultsBoxStyles();

  return (
    <Paper className={classes.noResultsBox}>
      <Typography component="p" color="textSecondary" className={classes.noResultsLine}>
        { isSearch ? <SadFaceIcon className={classes.mainIcon} /> : <InfoIcon className={classes.mainIcon} /> }
      </Typography>
      <Typography
        component="p"
        variant="subtitle1"
        color="textSecondary"
        className={classes.noResultsLine}
        style={{fontSize: '1.5em', opacity: 0.4}}
      >
        { isSearch ? 'No genes found' : 'No common genes for the selected pathways' }
      </Typography>
    {!isSearch && (
      <Paper variant="outlined" className={classes.noResultsInfoBox}>
        <List
          dense
          subheader={
            <ListSubheader className={classes.noResultsSubheader}>
              Try one of the following:
            </ListSubheader>
          }
        >
          <ListItem className={classes.noResultsItem}>
            <ListItemIcon className={classes.noResultsItemIcon}>
              <KeyboardReturnIcon className={classes.noResultsItemIconIcon} />
            </ListItemIcon>
            <ListItemText
              className={classes.noResultsItemText}
              primary={
                <Grid container>
                  <span>select the&nbsp;&nbsp;&nbsp;</span>
                  <VennUnionIcon style={{fontSize: '1.5em', color: theme.palette.text.secondary}} />
                  <span style={{color: theme.palette.text.secondary}}>&nbsp;Union</span>
                  <span>&nbsp;&nbsp;&nbsp;option</span>
                </Grid>
              }
            />
          </ListItem>
          <ListItem className={classes.noResultsItem}>
            <ListItemIcon className={classes.noResultsItemIcon}>
              <KeyboardReturnIcon className={classes.noResultsItemIconIcon} />
            </ListItemIcon>
            <ListItemText className={classes.noResultsItemText} primary="select fewer pathways" />
          </ListItem>
        </List>
      </Paper>
    )}
    </Paper>
  );
};
NoResultsBox.propTypes = {
  isSearch: PropTypes.bool,
};


const useGeneListPanelStyles = makeStyles((theme) => ({
  listItem: {
    paddingTop: 4,
    paddingBottom: 0,
    backgroundColor: theme.palette.background.paper,
  },
  listItemText: {
    marginTop: 0,
    marginBottom: 0,
  },
  listItemHeader: {
    height: 24,
    margin: 0,
    borderRadius: 4,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    cursor: 'pointer',
    '&[disabled]': {
      color: theme.palette.divider,
      cursor: 'default',
      '&:hover': {
        textDecoration: 'none',
      },
    },
  },
  listItemHeaderSelected: {
    backgroundColor: theme.palette.action.selected,
    '&:hover': {
      backgroundColor: HOVER_SELECTION_BG,
    },
  },
  bulletIconContainer: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
  bulletIcon: {
    marginRight: '4px',
    color: 'inherit',
    opacity: 0.5
  },
  geneContainer: {
    width: '40%',
  },
  chartContainer: {
    width: CHART_WIDTH,
    padding: '0 8px',
  },
}));

const GeneListPanel = ({ 
  controller,
  genes,
  selectedGene,
  initialIndex = -1,
  isSearch = false,
  isIntersection,
  isMobile,
  onGeneClick,
}) => {
  const classes = useGeneListPanelStyles();
  const virtuosoRef = useRef();

  useEffect(() => {
    // Check whether we need to change scroll the list to the required index
    if (genes != null && initialIndex >= 0 &&
        genes.length > initialIndex &&
        virtuosoRef && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index: initialIndex, behavior: 'auto' });
    }
  });

  if ((isSearch || isIntersection) && genes && genes.length === 0) {
    return <NoResultsBox isSearch={isSearch} isIntersection={isIntersection} />;
  }

  const { minRank, maxRank } = controller;
  const rankColorScale = chroma.scale(REG_COLOR_RANGE.range3).domain([minRank, 0, maxRank]);

  const getRankColor = rank => {
    return rankColorScale(rank).toString();
  };

  const RankTooltip = withStyles(theme => ({
    tooltipPlacementTop: {
      marginBottom: 8,
    },
    tooltipPlacementRight: {
      marginTop: -2,
      marginLeft: 3,
    },
  }))(Tooltip);

  const renderGeneRow = (idx) => {
    const g = genes != null && genes.length > 0 ? genes[idx] : null;
    const symbol = g ? g.gene : null;
    const rank = g ? g.rank : null;

    const isGeneTextOverflowing = (id) => {
      const elem = document.getElementById(id);

      if (elem) {
        const { overflow } = elem.style;

        if (!overflow || overflow === "visible")
          elem.style.overflow = "hidden";

        const isOverflowing = elem.clientWidth < elem.scrollWidth || elem.clientHeight < elem.scrollHeight;
        elem.style.overflow = overflow;

        return isOverflowing;
      }

      return false;
    };

    const loading = genes == null;
    const isSelected = !loading && selectedGene != null && selectedGene === symbol;

    const roundDigits = GENE_RANK_ROUND_DIGITS;
    const roundedRank = _.isNumber(rank) ? (Math.round(rank * Math.pow(10, roundDigits)) / Math.pow(10, roundDigits)) : NaN;
    
    const rankColor = getRankColor(rank);

    // Tooltip for rank:
    const sign = roundedRank > 0 ? '+' : '';
    let reg = roundedRank > 0 ? 'up' : 'down';
    reg = roundedRank !== 0 ? ` (${reg} regulated)` : '';
    const tooltip = `Differential gene expression: ${sign}${roundedRank.toFixed(GENE_RANK_ROUND_DIGITS)}${reg}`;

    const geneTextElemId = `gene_${idx}`;

    const handleGeneClick = (symbol) => {
      if (!loading)
        onGeneClick(symbol);
    };

    return (
      <ListItem key={idx} alignItems="flex-start" className={classes.listItem}>
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
                className={clsx(classes.listItemHeader, { [classes.listItemHeaderSelected]: isSelected })}
                onClick={() => handleGeneClick(symbol)}
              >
                <Grid item className={classes.geneContainer}>
                  <Grid container direction="row" justifyContent="flex-start" alignItems="center">
                    <Grid item xs={3} className={classes.bulletIconContainer}>
                      {isSelected ?
                        <KeyboardArrowDownIcon fontSize="small" className={classes.bulletIcon} />
                      :
                        <KeyboardArrowRightIcon fontSize="small" className={classes.bulletIcon} />
                      }
                    </Grid>
                    <Grid item xs={9}>
                      <Typography id={geneTextElemId} variant="body2" color="textPrimary" className={classes.geneName}>
                        {loading ? <Skeleton variant="text" width={72} height="1.5rem" /> : symbol }
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <RankTooltip arrow title={tooltip} enterDelay={750} placement={isMobile ? 'top' : 'right'}>
                  <Grid item className={classes.chartContainer}>
                    {loading ?
                      <Skeleton variant="rect" height={CHART_HEIGHT} />
                      :
                      !isNaN(roundedRank) && (
                        <UpDownHBar
                          value={roundedRank}
                          minValue={minRank}
                          maxValue={maxRank}
                          color={rankColor}
                          bgColor={theme.palette.background.default}
                          height={CHART_HEIGHT}
                          text={roundedRank.toFixed(GENE_RANK_ROUND_DIGITS)}
                        />
                      )
                    }
                  </Grid>
                </RankTooltip>
              </Grid>
              {isSelected && (
                <GeneMetadataPanel symbol={symbol} controller={controller} showSymbol={() => isGeneTextOverflowing(geneTextElemId)} />
              )}
            </Grid>
          }
        />
      </ListItem>
    );
  };

  const totalGenes = genes != null ? genes.length : 30/*(for the loading Skeletons)*/;

  return (
    <Virtuoso
      ref={virtuosoRef}
      totalCount={totalGenes}
      itemContent={idx => renderGeneRow(idx)}
      overscan={200}
      style={{ background: theme.palette.background.paper }} // fixes scrollbar colour on chrome
    />
  );
};
GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  genes: PropTypes.array,
  selectedGene: PropTypes.string,
  initialIndex: PropTypes.number,
  isSearch: PropTypes.bool,
  isIntersection: PropTypes.bool,
  isMobile: PropTypes.bool,
  onGeneClick: PropTypes.func.isRequired,
};

export default GeneListPanel;