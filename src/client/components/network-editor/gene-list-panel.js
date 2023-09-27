import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';

import { useQuery } from "react-query";
import chroma from 'chroma-js';
import { linkoutProps } from '../defaults';
import theme from '../../theme';
import { REG_COLOR_RANGE } from './network-style';
import { NetworkEditorController } from './controller';
import { UpDownHBar } from './charts';

import { makeStyles, withStyles } from '@material-ui/core/styles';

import { Virtuoso } from 'react-virtuoso';
import { ListItem, ListItemText, Tooltip } from '@material-ui/core';
import { Grid, Typography, Link } from '@material-ui/core';
import Skeleton from '@material-ui/lab/Skeleton';

import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';

const CHART_WIDTH = 160;
const CHART_HEIGHT = 16;
const GENE_RANK_ROUND_DIGITS = 2;

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  listItem: {
    paddingTop: 4,
    paddingBottom: 0,
  },
  listItemText: {
    marginTop: 0,
    marginBottom: 0,
  },
  listItemHeader: {
    height: 24,
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
  geneName: {
    color: 'inherit', 
    whiteSpace:'nowrap', 
    overflow:'hidden', 
    textOverflow:'ellipsis'
  },
  chartContainer: {
    width: CHART_WIDTH,
    padding: '0 8px',
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
  pathwayNameUl: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    paddingLeft: '1em',
    borderLeft: '1px solid #3A393A'
  },
  pathwayNameLi: {
    whiteSpace:'nowrap', 
    overflow:'hidden', 
    textOverflow:'ellipsis',
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  pathwayNameTitle: {
    marginTop: '0.333em',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.75rem'
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
  const classes = useStyles();

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

const GeneListPanel = ({ controller, genes, sort, isMobile }) => {
  const [selectedGene, setSelectedGene] = useState(null);
  const [resetScroll, setResetScroll] = useState(true);
  const classes = useStyles();
  const virtuoso = useRef();

  const cy = controller.cy;
  
  // Resets the scroll position when either the gene list or the sort has changed
  useEffect(() => {
    setResetScroll(true);
  }, [genes, sort]);

  useEffect(() => {
    if (resetScroll) {
      virtuoso.current.scrollToIndex({
        index: 0,
        behavior: 'auto',
      });
    }
  });

  const toggleGeneDetails = async (symbol) => {
    setResetScroll(false);
    setSelectedGene(selectedGene !== symbol ? symbol : null);
  };

  const updateCyHighlights = (symbol) => {
    let hl;
    if (symbol) {
      hl= cy.nodes(':childless').filter(n => {
        for (const gene of n.data('genes')) {
          if (symbol === gene)
            return true;
        }
        return false;
      });
    }

    let toHl = cy.nodes(':childless').add(cy.edges());
    let toUnhl = cy.collection();

    const highlight = (eles) => {
      toHl = toHl.add(eles);
      toUnhl = toUnhl.not(eles);
    };
    const unhighlight = (eles) => {
      toHl = toHl.not(eles);
      toUnhl = toUnhl.add(eles);
    };
    const normlight = (eles) => {
      toUnhl = toUnhl.not(eles);
    };

    cy.batch(() => {
      let initted = false;

      const initAllUnhighlighted = () => {
        if (initted) { return; }
        unhighlight(cy.elements());
        initted = true;
      };

      // genes
      if (hl && hl.length > 0) {
        initAllUnhighlighted();
        const nodes = cy.nodes( hl.map(n => { return '#' + n.data('id'); }).join(', ') );
        highlight(nodes);
        normlight(nodes.neighborhood());
      }

      // Apply highlights
      const eles = cy.elements();
      eles.not(toHl).removeClass('highlighted');
      eles.not(toUnhl).removeClass('unhighlighted');
      toHl.removeClass('unhighlighted').addClass('highlighted');
      toUnhl.removeClass('highlighted').addClass('unhighlighted');
    });
  };

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

    const rankColor = getRankColor(rank);

    const roundDigits = GENE_RANK_ROUND_DIGITS;
    const roundedRank = rank != null ? (Math.round(rank * Math.pow(10, roundDigits)) / Math.pow(10, roundDigits)) : 0;
    
    // Tooltip for rank:
    const sign = roundedRank > 0 ? '+' : '';
    let reg = roundedRank > 0 ? 'up' : 'down';
    reg = roundedRank !== 0 ? ` (${reg} regulated)` : '';
    const tooltip = `Differential gene expression: ${sign}${roundedRank.toFixed(GENE_RANK_ROUND_DIGITS)}${reg}`;

    const geneTextElemId = `gene_${idx}`;

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
                className={classes.listItemHeader}
                onClick={() => { if (!loading) toggleGeneDetails(symbol); }}
                onMouseEnter={() => { if (!loading) updateCyHighlights(symbol); }}
                onMouseLeave={() => { if (!loading) updateCyHighlights(); }}
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
                      rank != null && (
                        <UpDownHBar
                          value={rank}
                          minValue={minRank}
                          maxValue={maxRank}
                          color={rankColor}
                          bgColor={theme.palette.background.focus}
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
      ref={virtuoso}
      totalCount={totalGenes}
      itemContent={idx => renderGeneRow(idx)}
      overscan={200}
      style={{ 'background': 'rgb(24, 24, 24)' }} // fixes scrollbar colour on chrome
    />
  );
};

GeneMetadataPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  symbol: PropTypes.string.isRequired,
  showSymbol: PropTypes.func
};
GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  genes: PropTypes.array,
  sort: PropTypes.string,
  isMobile: PropTypes.bool,
};

export default GeneListPanel;