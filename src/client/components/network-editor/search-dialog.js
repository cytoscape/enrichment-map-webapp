import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import theme from '../../theme';
import { DEFAULT_PADDING } from '../defaults';
import { NetworkEditorController } from './controller';
import { NES_COLOR_RANGE, nodeLabel } from './network-style';

import { makeStyles, } from '@material-ui/core/styles';

import { Marker } from "react-mark.js";
import { Virtuoso } from 'react-virtuoso';
import { Box, Dialog, DialogContent, DialogTitle, Grid, Paper } from "@material-ui/core";
import { ListItem, ListItemText } from '@material-ui/core';
import { Button, IconButton, Tooltip, Typography, Link } from "@material-ui/core";
import HSBar from "react-horizontal-stacked-bar-chart";
import SearchBar from "material-ui-search-bar";

import CloseIcon from '@material-ui/icons/Close';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';


const CHART_WIDTH = 160;
const CHART_HEIGHT = 16;
const ROUND_DIGITS = 2;

const RANGE_COLOR = theme.palette.background.focus;
const UP_COLOR    = NES_COLOR_RANGE.up;
const DOWN_COLOR  = NES_COLOR_RANGE.down;


const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  listItem: {
    paddingTop: 0,
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
    marginBottom: theme.spacing(2),
    // cursor: 'pointer',
    // '&:hover': {
    //   color: theme.palette.link.main,
    // },
    // "&[disabled]": {
    //   color: theme.palette.divider,
    //   cursor: "default",
    //   "&:hover": {
    //     textDecoration: "none"
    //   }
    // },
  },
  listItemFooter: {
    marginTop: theme.spacing(1),
  },
  bulletIcon: {
    marginRight: theme.spacing(1),
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
  rankChartContainer: {
    width: CHART_WIDTH,
    padding: 0,
  },
  nesChartContainer: {
    width: CHART_WIDTH,
    padding: 0,
    marginTop: theme.spacing(0.75),
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
  barChartParent: {
    position: 'relative',
    pointerEvents: 'none',
  },
  barChartText: {
    position: "absolute",
    top: 0,
    fontSize: "0.75rem",
    color: "#999",
    mixBlendMode: 'difference',
    marginLeft: '0.125em',
    marginRight: '0.125em',
    lineHeight: '1.7em'
  },
  pathwayIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.text.disabled,
  },
  pathwayInFigIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.success.main,
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
  pathwayCaption: {
    marginTop: 0,
    marginLeft: theme.spacing(3),
  },
  dialogPaper: {
    minHeight: '95vh',
    maxHeight: '95vh',
    backgroundColor: 'rgba(0, 0, 0, 0.66)',
    backdropFilter: 'blur(4px)',
    border: `1px solid ${theme.palette.text.disabled}`,
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
    color: theme.palette.text.secondary,
    textAlign: 'center',
  },
  resultColumn: {
    backgroundColor: theme.palette.background.default,
  },
}));

const barChartTextStyle = (rank, minRank, maxRank) => {
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


const GeneListPanel = ({ searchTerms, items, controller }) => {
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
          data.push({ value: -(minRank - rank), color: RANGE_COLOR });
        }
        data.push({ value: -rank, color: DOWN_COLOR });
        if (maxRank > 0) {
          data.push({ value: maxRank, color: RANGE_COLOR });
        }
      } else {
        // Up regulated genes
        if (minRank < 0) {
          data.push({ value: -minRank, color: RANGE_COLOR });
        }
        data.push({ value: rank, color: UP_COLOR });
        if (maxRank > 0 && maxRank !== rank) {
          data.push({ value: (maxRank - rank), color: RANGE_COLOR });
        }
      }
    }

    const roundDigits = ROUND_DIGITS;
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
                          <Marker mark={searchTerms}>{ symbol }</Marker>
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item className={classes.rankChartContainer}>
                  {data && (
                    <div className={classes.barChartParent}>
                      <HSBar data={data} height={CHART_HEIGHT} />
                      <span className={classes.barChartText} style={barChartTextStyle(rank, minRank, maxRank)}>{roundedRank.toFixed(ROUND_DIGITS)}</span>
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

const PathwayListPanel = ({ searchTerms, items, controller, onNetworkWillChange, onNetworkChanged }) => {
  const cy = controller.cy;
  const classes = useStyles();
  const virtuoso = useRef(null);

  const maxNES = controller.style.magNES;
  const minNES = -maxNES;

  const nonClusterNodes = cy.nodes('[!mcode_cluster_id]');

  const renderPathwayRow = (idx) => {
    const p = items != null && items.length > 0 ? items[idx] : null;
    const nes = p ? p.NES : null;

    const applyLayout = async () => {
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
    };

    const addToFigure = async () => {
      // Start -- notify
      onNetworkWillChange();
      // Add node
      cy.add({
        group: 'nodes',
        data: {
          'name': [ p.name.toUpperCase() + '%' ], // TODO set the actual name with DB_SOURCE, etc.
          'NES': p.NES,
          'gs_size': p.size,
          'mcode_cluster_id': null,
          'gs_type': null,
          'pvalue': p.pval,
          'padj': p.padj,
          'added_by_user': true,
        },
        position: { x: 0, y: 0 },
      });
      // Apply layout again
      await applyLayout();
      // End -- notify
      onNetworkChanged();
    };

    const removeFromFigure = async (nodeId) => {
      const node = cy.nodes(`[id = '${nodeId}']`);
      if (!node) { return; }
      // Start -- notify
      onNetworkWillChange();
      // Fit network on node to be removed
      await cy.animation({ fit: { padding: DEFAULT_PADDING }, duration: 500 });
      // Animation - node disappears
      var ani = node.animation({
        style: {
          'background-opacity': 0,
          'label': '',
          'width': 0
        },
        duration: 500,
      });
      ani.play().promise().then(async () => {
        // Remove node
        node.remove();
        // Apply layout again
        await applyLayout();
        // End -- notify
        onNetworkChanged();
      });
    };

    let data;

    if (nes != null) {
      data = [];
      
      if (nes < 0) {
        // Negative NES
        if (nes > minNES) {
          data.push({ value: Math.abs(minNES - nes), color: RANGE_COLOR });
        }
        data.push({ value: Math.abs(nes), color: DOWN_COLOR });
        data.push({ value: maxNES, color: RANGE_COLOR });
      } else {
        // Positive NES
        data.push({ value: Math.abs(minNES), color: RANGE_COLOR });
        data.push({ value: nes, color: UP_COLOR });
        if (nes < maxNES) {
          data.push({ value: (maxNES - nes), color: RANGE_COLOR });
        }
      }
    }
    
    const description = p.description;
    const name = p.name.toLowerCase() == description.toLowerCase() ? description : p.name; // if they are the same, description usually has better case
    const genes = Array.isArray(p.genes) ? p.genes.sort() : [];
    const genesText = genes.join(', ');
    
    const clusterId = p['mcode_cluster_id'];
    const clusters = cy.nodes(`[mcode_cluster_id = "${clusterId}"]`);
    const clusterName = clusters.length > 0 ? nodeLabel(clusters[0]) : null;
    const isInCluster = clusterId != null && clusters.length > 0; // Pathways is a cluster node in figure
    let isInFigure = isInCluster;
    let addedByUser = false;
    let addedNodeId = null;

    const nameToken = p.name.toUpperCase() + '%';

    console.log(p);

    // Also check wether this pathway is a single-pathway node, not just in a cluster
    for (const n of nonClusterNodes ) {
      const nodeName = n.data('name');

      if (nodeName && nodeName.length === 1 && nodeName[0].startsWith(nameToken)) {
        isInFigure = true;
        addedByUser = Boolean(n.data('added_by_user'));
        addedNodeId = addedByUser ? n.data('id') : null;
        break;
      }
    }

    const roundDigits = ROUND_DIGITS;
    const roundedNES = nes != null ? (Math.round(nes * Math.pow(10, roundDigits)) / Math.pow(10, roundDigits)) : 0;
    
    const bulletIcon = isInFigure
            ? <CheckCircleOutlineIcon className={classes.pathwayInFigIcon} />
            : <RadioButtonUncheckedIcon className={classes.pathwayIcon} />;

    const PathwayHeader = () => {
      return (
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems='center'
          className={classes.listItemHeader}
        >
          <Grid item>
            <Grid container direction="row" justifyContent="flex-start">
              <Grid>{ bulletIcon }</Grid>
              <Grid>
                <Typography variant="body1" color="textPrimary">
                  <Marker mark={searchTerms}>{ name }</Marker>
                </Typography>
              </Grid>
            </Grid>
          {isInFigure && (
            <Grid item className={classes.pathwayCaption}>
            {isInCluster && clusterName && (
              <Typography component="p" variant="caption" color="textSecondary">
                &#10003; In cluster <Typography component="span" variant="caption" color="textPrimary">{ clusterName.toUpperCase() }</Typography>.
              </Typography>
            )}
            {addedByUser && (
              <Typography component="p" variant="caption" color="textSecondary">
                &#10003; Added to the figure.
              </Typography>
            )}
            </Grid>
          )}
          </Grid>
        </Grid>
      );
    };

    return (
      <ListItem key={idx} alignItems="flex-start" className={classes.listItem}>
        <ListItemText
          className={classes.listItemText}
          primary={
            <Paper variant="outlined" className={classes.listPaper}>
              <Grid container direction="column" alignItems='flex-start' spacing={1}>
                <PathwayHeader />
              {description !== name && (
                <Grid item>
                  <Typography variant="body2" color="textSecondary">
                    <Marker mark={searchTerms}>{ description }</Marker>
                  </Typography>
                </Grid>
              )}
                <Grid item>
                  <Grid container direction="row" alignItems='center' spacing={2}>
                    <Grid item>
                      <Typography component="span" variant="body2" color="textPrimary">
                        NES:
                      </Typography>
                    </Grid>
                    <Grid item className={classes.nesChartContainer}>
                    {data && (
                      <div className={classes.barChartParent}>
                        <HSBar data={data} height={CHART_HEIGHT} />
                        <span className={classes.barChartText} style={barChartTextStyle(nes, minNES, maxNES)}>{roundedNES.toFixed(ROUND_DIGITS)}</span>
                      </div>
                    )}
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item>
                  <Typography component="span" variant="body2" color="textPrimary">
                    P value:
                  </Typography>
                  &nbsp;
                  <Typography component="span" variant="body2" color="textSecondary" style={{marginLeft: theme.spacing(1)}}>
                    { p.pval }
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography component="span" variant="body2" color="textPrimary">
                    P value (adjustment):
                  </Typography>
                  &nbsp;
                  <Typography component="span" variant="body2" color="textSecondary" style={{marginLeft: theme.spacing(1)}}>
                    { p.padj }
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography component="span" variant="body2" color="textPrimary">
                    Genes ({ genes.length }):
                  </Typography>
                  &nbsp;
                  <Typography component="span" variant="body2" color="textSecondary" style={{marginLeft: theme.spacing(1)}}>
                    <Marker mark={searchTerms}>{ genesText }</Marker>
                  </Typography>
                </Grid>
                <Grid item>
                  <Grid container direction="row" spacing={2} className={classes.listItemFooter}>
                    <Grid item>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<AddIcon />}
                        disabled={addedByUser || (isInFigure && !isInCluster)}
                        onClick={addToFigure}
                      >
                        Add to Figure
                      </Button>
                    </Grid>
                    <Grid item>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<RemoveIcon />}
                        disabled={!isInFigure || !addedByUser}
                        onClick={() => removeFromFigure(addedNodeId)}
                      >
                        Remove from Figure
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Paper>
          }
        />
      </ListItem>
    );
  };

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

const ResultTitle = ({ title, total }) => {
  return (
    <Typography variant="body2" color="textSecondary" style={{marginLeft: theme.spacing(2), marginTop: theme.spacing(1), marginBottom: theme.spacing(1)}}>
      { total.toLocaleString("en-US") } { title }{ total === 1 ? '' : 's'}{ total > 0 ? ':' : '' }
    </Typography>
  );
};

export const SearchDialog = ({ open, controller, onClose, fullScreen }) => {
  const [addingPathway, setAddingPathway] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const searchValueRef = useRef(searchValue);
  searchValueRef.current = searchValue;

  const searchTerms = searchValue.split(' ');

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

  const onNetworkWillChange = () => {
    setAddingPathway(true);
  };
  const onNetworkChanged = () => {
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
        <Paper variant="outlined">
          <Grid container direction="row" alignItems='flex-start' spacing={0}>
            <Grid item xs={4} className={classes.resultColumn}>
              <ResultTitle title="gene" total={searchResult.genes.length} />
              <GeneListPanel
                searchTerms={searchTerms}
                items={searchResult.genes}
                controller={controller}
              />
            </Grid>
            <Grid item xs={8} className={classes.resultColumn}>
              <ResultTitle title="pathway" total={searchResult.pathways.length} />
              <PathwayListPanel
                searchTerms={searchTerms}
                items={searchResult.pathways}
                controller={controller}
                onNetworkWillChange={onNetworkWillChange}
                onNetworkChanged={onNetworkChanged}
              />
            </Grid>
          </Grid>
        </Paper>
      )}
      </DialogContent>
    </Dialog>
  );
};

GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  searchTerms: PropTypes.arrayOf(String).isRequired,
  items: PropTypes.array,
};
PathwayListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  searchTerms: PropTypes.arrayOf(String).isRequired,
  items: PropTypes.array,
  onNetworkWillChange: PropTypes.func.isRequired,
  onNetworkChanged: PropTypes.func.isRequired,
};
ResultTitle.propTypes = {
  title: PropTypes.string.isRequired,
  total: PropTypes.number.isRequired,
};
SearchDialog.propTypes = {
  open: PropTypes.bool,
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  onClose: PropTypes.func.isRequired,
  fullScreen: PropTypes.bool,
};

export default SearchDialog;