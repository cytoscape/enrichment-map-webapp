import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import theme from '../../theme';
import { DEFAULT_PADDING } from '../defaults';
import { NetworkEditorController } from './controller';
import { NES_COLOR_RANGE } from './network-style';

import { makeStyles, withStyles } from '@material-ui/core/styles';

import { Virtuoso } from 'react-virtuoso';
import { Box, Dialog, DialogContent, DialogTitle, Grid, Paper } from "@material-ui/core";
import { List, ListItem, ListItemText } from '@material-ui/core';
import { Button, IconButton, Tooltip, Typography, Link } from "@material-ui/core";
import HSBar from "react-horizontal-stacked-bar-chart";
import SearchBar from "material-ui-search-bar";

import CloseIcon from '@material-ui/icons/Close';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';


const CHART_WIDTH = 160;
const CHART_HEIGHT = 16;
const GENE_RANK_ROUND_DIGITS = 2;

const RANK_RANGE_COLOR = theme.palette.background.focus;
const UP_RANK_COLOR   = NES_COLOR_RANGE.up;
const DOWN_RANK_COLOR = NES_COLOR_RANGE.down;


const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  listItem: {
    paddingTop: 4,
    paddingBottom: 0,
  },
  listPaper: {
    padding: theme.spacing(1),
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
  listItemFooter: {
    marginTop: theme.spacing(2),
  },
  bulletIcon: {
    marginRight: '4px',
    color: 'inherit',
    opacity: 0.5
  },
  geneNameContainer: {
    // width: '40%',
  },
  geneName: {
    color: 'inherit', 
    // whiteSpace:'nowrap', 
    // overflow:'hidden', 
    // textOverflow:'ellipsis'
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
  errorMsg: {
    color: theme.palette.error.main,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  rankBarParent: {
    position: 'relative',
    pointerEvents: 'none',
  },
  rankBarText: {
    position: "absolute",
    top: 0,
    fontSize: "0.75rem",
    color: "#999",
    mixBlendMode: 'difference',
    marginLeft: '0.125em',
    marginRight: '0.125em',
    lineHeight: '1.7em'
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



  dialogPaper: {
    minHeight: '95vh',
    maxHeight: '95vh',
  },
  searchBar: {
    marginLeft: 'auto',
    marginRight: 'auto',
    borderColor: theme.palette.divider,
    borderWidth: '1px',
    borderStyle: 'solid',
    maxWidth: '400px',
  },
  content: {
    height: '100%',
    margin: '0 0 20px 0',
  },
  emptyMessage: {
    marginTop: '20px',
    color: theme.palette.text.disabled,
    textAlign: 'center',
  },
}));

const rankBarTextStyle = (rank, minRank, maxRank) => {
  if (minRank > 0 && maxRank > 0) { // all positive => bars start at left and go right
    return { left: 0 };
  } else if (minRank < 0 && maxRank < 0) { // all negative => bars start at right and go left
    return { right: 0 };
  } else if (rank < 0) { // neg. rank should be shifted right by the size of the pos. max. bar size
    let offset = Math.abs(maxRank) / (Math.abs(minRank) + Math.abs(maxRank)) * 100;
    return {
      right: `${offset}%`
    };
  } else { // pos. rank should be shifted left by the size of the neg. max. bar size
    let offset = Math.abs(minRank) / (Math.abs(minRank) + Math.abs(maxRank)) * 100;
    return { left: `${offset}%` };
  }
};


const GeneListPanel = ({ items, controller }) => {
  const [selectedGene, setSelectedGene] = useState(null);
  const classes = useStyles();
  const virtuoso = useRef(null);
  
  const toggleGeneDetails = async (symbol) => {
    setSelectedGene(selectedGene !== symbol ? symbol : null);
  };

  const { minRank, maxRank } = controller;

  const renderGeneRow = (idx) => {
    const g = items != null && items.length > 0 ? items[idx] : null;
    const symbol = g ? g.gene : null;
    const rank = g ? g.rank : null;

    let data;

    if (rank != null) {
      data = [];
      
      if (rank < 0) {
        // Low regulated genes
        if (minRank < 0 && minRank !== rank) {
          data.push({ value: -(minRank - rank), color: RANK_RANGE_COLOR });
        }
        data.push({ value: -rank, color: DOWN_RANK_COLOR });
        if (maxRank > 0) {
          data.push({ value: maxRank, color: RANK_RANGE_COLOR });
        }
      } else {
        // Up regulated genes
        if (minRank < 0) {
          data.push({ value: -minRank, color: RANK_RANGE_COLOR });
        }
        data.push({ value: rank, color: UP_RANK_COLOR });
        if (maxRank > 0 && maxRank !== rank) {
          data.push({ value: (maxRank - rank), color: RANK_RANGE_COLOR });
        }
      }
    }

    const roundDigits = GENE_RANK_ROUND_DIGITS;
    const roundedRank = rank != null ? (Math.round(rank * Math.pow(10, roundDigits)) / Math.pow(10, roundDigits)) : 0;
    
    const geneTextElemId = `gene_${idx}`;

    return (
      <ListItem key={idx} alignItems="flex-start" className={classes.listItem}>
        <ListItemText
          className={classes.listItemText}
          primary={
            <Paper variant="outlined" className={classes.listPaper}>
              <Grid container direction="column" alignItems='flex-start'>
                <Grid
                  container
                  direction="row"
                  justifyContent="space-between"
                  alignItems='center'
                  className={classes.listItemHeader}
                  onClick={() => { toggleGeneDetails(symbol); }}
                >
                  <Grid item className={classes.geneNameContainer}>
                    <Grid container direction="row" justifyContent="flex-start">
                      <Grid item>
                        <KeyboardArrowRightIcon fontSize="small" className={classes.bulletIcon} />
                      </Grid>
                      <Grid item>
                        <Typography id={geneTextElemId} variant="body2" color="textPrimary" className={classes.geneName}>
                          { symbol }
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item className={classes.chartContainer}>
                  {data && (
                    <div className={classes.rankBarParent}>
                      <HSBar data={data} height={CHART_HEIGHT} />
                      <span className={classes.rankBarText} style={rankBarTextStyle(rank, minRank, maxRank)}>{roundedRank.toFixed(GENE_RANK_ROUND_DIGITS)}</span>
                    </div>
                  )}
                  </Grid>
                </Grid>
                {/* {isSelected && (
                  <GeneMetadataPanel symbol={symbol} controller={controller} showSymbol={() => isGeneTextOverflowing(geneTextElemId)} />
                )} */}
              </Grid>
            </Paper>
          }
        />
      </ListItem>
    );
  };

  console.log(items);

  return (
    <Virtuoso
      ref={virtuoso}
      totalCount={items.length}
      itemContent={idx => renderGeneRow(idx)}
      overscan={200}
      style={{ height: '90vh', background: 'rgb(24, 24, 24)'/* fixes scrollbar colour on chrome */ }}
    />
  );
};

const PathwayListPanel = ({ items, controller, onPathwayWillBeAdded, onPathwayAdded }) => {
  const cy = controller.cy;
  const classes = useStyles();
  const virtuoso = useRef(null);

  const { minRank, maxRank } = controller;

  const renderPathwayRow = (idx) => {
    const p = items != null && items.length > 0 ? items[idx] : null;
    const name = p ? p.name : null;
    const rank = p ? p.NES : null;

    // console.log(controller.cy.nodes().data());
    // const pathwayIsNode = controller.cy.nodes(`[id == ${p.id}]`).length > 0;
    // console.log(pathwayIsNode);

    const addToFigure = async () => {
      // Start -- notify
      onPathwayWillBeAdded();
      // Add node
      cy.add({
        group: 'nodes',
        data: {
          'name': [ p.name ], // TODO search item's name is not the same notation
          'NES': p.NES,
          'gs_size': p.size,
          'mcode_cluster_id': null,
          'gs_type': null,
          'pvalue': p.pval,
          'padj': p.padj,
        },
        position: { x: 0, y: 0 },
      });
      // Apply layout again
      const layout = cy.layout({
        name: 'grid',
        fit: true,
        padding: DEFAULT_PADDING,
        cols: 1,
        sort: (n1, n2) => n2.data('NES') - n1.data('NES'),
        transform: (n, pos) => {
          if      (n.data('NES') > 0) { pos.x += n.width() / 2; }
          else if (n.data('NES') < 0) { pos.x -= n.width() / 2; }
          return pos;
        },
        avoidOverlap: true,
        condense: true,
        animate: true,
        animationDuration: 1000,
        animationEasing: 'ease-out',
      });
      const onStop = layout.promiseOn('layoutstop');
      layout.run();
      await onStop;
      // End -- notify
      onPathwayAdded();
    };

    let data;

    if (rank != null) {
      data = [];
      
      if (rank < 0) {
        // Negative NES
        if (minRank < 0 && minRank !== rank) {
          data.push({ value: -(minRank - rank), color: RANK_RANGE_COLOR });
        }
        data.push({ value: -rank, color: DOWN_RANK_COLOR });
        if (maxRank > 0) {
          data.push({ value: maxRank, color: RANK_RANGE_COLOR });
        }
      } else {
        // Positive NES
        if (minRank < 0) {
          data.push({ value: -minRank, color: RANK_RANGE_COLOR });
        }
        data.push({ value: rank, color: UP_RANK_COLOR });
        if (maxRank > 0 && maxRank !== rank) {
          data.push({ value: (maxRank - rank), color: RANK_RANGE_COLOR });
        }
      }
    }

    const roundDigits = GENE_RANK_ROUND_DIGITS;
    const roundedRank = rank != null ? (Math.round(rank * Math.pow(10, roundDigits)) / Math.pow(10, roundDigits)) : 0;
    
    const geneTextElemId = `pathway_${idx}`;

    return (
      <ListItem key={idx} alignItems="flex-start" className={classes.listItem}>
        <ListItemText
          className={classes.listItemText}
          primary={
            <Paper variant="outlined" className={classes.listPaper}>
              <Grid container direction="column" alignItems='flex-start'>
                <Grid
                  container
                  direction="row"
                  justifyContent="space-between"
                  alignItems='center'
                  className={classes.listItemHeader}
                >
                  <Grid item className={classes.geneNameContainer}>
                    <Grid container direction="row" justifyContent="flex-start">
                      <Grid>
                        <KeyboardArrowRightIcon fontSize="small" className={classes.bulletIcon} />
                      </Grid>
                      <Grid>
                        <Typography id={geneTextElemId} variant="body2" color="textPrimary" className={classes.geneName}>
                          { name }
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item className={classes.chartContainer}>
                    {data && (
                      <div className={classes.rankBarParent}>
                        <HSBar data={data} height={CHART_HEIGHT} />
                        <span className={classes.rankBarText} style={rankBarTextStyle(rank, minRank, maxRank)}>{roundedRank.toFixed(GENE_RANK_ROUND_DIGITS)}</span>
                      </div>
                    )}
                  </Grid>
                </Grid>
                <Grid container direction="row" spacing={2} className={classes.listItemFooter}>
                  <Grid item>
                    <Button variant="outlined" color="primary" startIcon={<AddIcon />} onClick={addToFigure}>
                      Add to Figure
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button variant="outlined" color="primary" startIcon={<RemoveIcon />}>
                      Remove from Figure
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Paper>
          }
        />
      </ListItem>
    );
  };

  console.log(items);

  return (
    <Virtuoso
      ref={virtuoso}
      totalCount={items.length}
      itemContent={idx => renderPathwayRow(idx)}
      overscan={200}
      style={{ height: '90vh', background: 'rgb(24, 24, 24)'/* fixes scrollbar colour on chrome */ }}
    />
  );
};

export const SearchDialog = ({ open, controller, onClose, fullScreen }) => {
  const [addingPathway, setAddingPathway] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const searchValueRef = useRef(searchValue);
  searchValueRef.current = searchValue;

  const classes = useStyles();

  const cancelSearch = () => {
    setSearchValue('');
    setSearchResult(null);
  };
  const search = (val) => {
    const query = val.trim();
    
    if (val.length > 0) {
      const res = { };
      res['genes'] = controller.searchGenes(query);
      res['pathways'] = controller.searchPathways(query);
      setSearchValue(val);
      setSearchResult(res);
    } else {
      cancelSearch();
    }
  };

  const onPathwayWillBeAdded = () => {
    setAddingPathway(true);
  };
  const onPathwayAdded = () => {
    setAddingPathway(false);
  };

  return (
    <Dialog
      open={open}
      classes={fullScreen ? {} : { paper: classes.dialogPaper }}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      style={{opacity: addingPathway ? 0 : 1.0 }}
    >
      <DialogTitle>
        <SearchBar
          autoFocus={true}
          className={classes.searchBar}
          value={searchValue}
          onChange={search}
          onCancelSearch={cancelSearch}
        />
      </DialogTitle>
      <Box position="absolute" top={0} right={0}>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent className={classes.content} style={{ overflow: "hidden" }}>
      {searchResult == null && (
        <Typography className={classes.emptyMessage}>Search for genes and pathways...</Typography>
      )}
      {searchResult != null && (
        <Grid container direction="row" alignItems='flex-start' spacing={theme.spacing(4)}>
          <Grid item xs={4}>
            <GeneListPanel
              items={searchResult.genes}
              controller={controller}
            />
          </Grid>
          <Grid item xs={8}>
            <PathwayListPanel
              items={searchResult.pathways}
              controller={controller}
              onPathwayWillBeAdded={onPathwayWillBeAdded}
              onPathwayAdded={onPathwayAdded}
            />
          </Grid>
        </Grid>
      )}
      </DialogContent>
    </Dialog>
  );
};

GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  items: PropTypes.array,
};
PathwayListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  items: PropTypes.array,
  onPathwayWillBeAdded: PropTypes.func.isRequired,
  onPathwayAdded: PropTypes.func.isRequired,
};
SearchDialog.propTypes = {
  open: PropTypes.bool,
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  onClose: PropTypes.func.isRequired,
  fullScreen: PropTypes.bool,
};

export default SearchDialog;