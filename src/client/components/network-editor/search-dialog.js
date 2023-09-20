import React, { forwardRef, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import theme from '../../theme';
import { DEFAULT_PADDING } from '../defaults';
import { NetworkEditorController } from './controller';
import { NODE_OPACITY, TEXT_OPACITY, NES_COLOR_RANGE, nodeLabel } from './network-style';
import { UpDownHBar, PValueStarRating } from './charts';

import { makeStyles, } from '@material-ui/core/styles';

import { Marker } from "react-mark.js";
import { Virtuoso } from 'react-virtuoso';
import Slide from '@material-ui/core/Slide';
import { Box, Dialog, DialogContent, DialogTitle, Grid, Paper } from "@material-ui/core";
import { ListItem, ListItemText } from '@material-ui/core';
import { Button, IconButton, Typography, Tooltip } from "@material-ui/core";
import CircularProgress from '@material-ui/core/CircularProgress';
import SearchBar from "material-ui-search-bar";

import CloseIcon from '@material-ui/icons/Close';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';


const CHART_WIDTH = 160;
const CHART_HEIGHT = 16;
const ROUND_DIGITS = 2;


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
    background: 'inherit',
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
  subtitleContainer: {
    width: 100,
  },
  nesChartContainer: {
    width: CHART_WIDTH,
    padding: 0,
  },
  linkout: {
    fontSize: '0.75rem',
    color: theme.palette.link.main,
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
    overflow: "hidden",
  },
  contentPaper: {
    background: 'inherit',
  },
  emptyMessage: {
    marginTop: '20px',
    color: theme.palette.text.secondary,
    textAlign: 'center',
  },
  resultColumn: {
    // backgroundColor: theme.palette.background.default,
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

const PathwayListPanel = ({ searchTerms, items, controller, onNetworkWillChange, onNetworkChanged }) => {
  const cy = controller.cy;
  const classes = useStyles();
  const virtuoso = useRef();

  const nonClusterNodes = cy.nodes('[!mcode_cluster_id]');

  const renderPathwayRow = (idx) => {
    const p = items != null && items.length > 0 ? items[idx] : null;
    const nes = p ? p.NES : null;

    const addToFigure = async () => {
      // Start -- notify
      onNetworkWillChange();
      // Unselect everything
      cy.elements().unselect();
      // Add node
      const node = await cy.add({
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
        style: {
          'opacity': 0,
          'text-opacity': 0,
        },
        position: { x: Math.round(Math.random() * 100), y: Math.round(Math.random() * 100)},
      });
      var ani = node.animation({
        style: {
          'opacity': NODE_OPACITY,
          'text-opacity': TEXT_OPACITY,
        },
        duration: 500,
      });
      ani.play().promise().then(async () => {
        // Select the new node
        node.select();
        // End -- notify
        onNetworkChanged();
      });
    };

    const removeFromFigure = async (nodeId) => {
      const node = cy.nodes(`[id = '${nodeId}']`);
      if (!node) { return; }
      // Start -- notify
      onNetworkWillChange();
      // Fit network on node to be removed
      await cy.animate({ fit: { eles: node, padding: DEFAULT_PADDING }, duration: 500 });
      // Unselect before removing (the next animation will look better)
      node.unselect();
      // Animation - node disappears
      var ani = node.animation({
        style: {
          'background-opacity': 0,
          'text-opacity': 0,
        },
        duration: 500,
      });
      ani.play().promise().then(async () => {
        // Remove node
        node.remove();
        // End -- notify
        onNetworkChanged();
      });
    };
    
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
                    <Grid item className={classes.subtitleContainer}>
                      <Typography variant="body2" color="textPrimary">
                        P value:
                      </Typography>
                    </Grid>
                    <Grid>
                      <Tooltip title={p.pval}>
                        <span>
                          <PValueStarRating value={p.pval} />
                        </span>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item>
                  <Grid container direction="row" alignItems='center' spacing={2}>
                    <Grid item className={classes.subtitleContainer}>
                      <Typography variant="body2" color="textPrimary">
                        NES:
                      </Typography>
                    </Grid>
                    <Grid item className={classes.nesChartContainer}>
                    {nes != null && (
                      <UpDownHBar
                        value={nes}
                        minValue={-controller.style.magNES}
                        maxValue={controller.style.magNES}
                        upColor={NES_COLOR_RANGE.up}
                        downColor={NES_COLOR_RANGE.down}
                        bgColor={theme.palette.background.focus}
                        height={CHART_HEIGHT}
                        text={roundedNES.toFixed(ROUND_DIGITS)}
                      />
                    )}
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item className={classes.listItemFooter}>
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
      style={{ height: '90vh' }}
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

const SlideTransition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const SearchDialog = ({ open, controller, onClose, fullScreen }) => {
  const [networkChanging, setNetworkChanging] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const searchValueRef = useRef(searchValue);
  searchValueRef.current = searchValue;

  const searchTerms = searchValue.toLowerCase().split(' ');

  const classes = useStyles();

  const cancelSearch = () => {
    setSearchValue('');
    setSearchResult(null);
  };
  const search = (val) => {
    const query = val.trim();
    
    if (query.length > 0) {
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
    setNetworkChanging(true);
  };
  const onNetworkChanged = () => {
    setNetworkChanging(false);
  };

  return (
    <Dialog
      open={open}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      TransitionComponent={SlideTransition}
      classes={fullScreen ? {} : { paper: classes.dialogPaper }}
      style={{  backdropFilter: networkChanging ? 'blur(2px)' : 'blur(16px)',}}
    >
      <DialogTitle>
        <SearchBar
          autoFocus={true}
          className={classes.searchBar}
          value={searchValue}
          disabled={networkChanging}
          onChange={search}
          onCancelSearch={cancelSearch}
        />
      </DialogTitle>
      <Box position="absolute" top={0} right={0}>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent className={classes.content}>
      {networkChanging && (
        <Box style={{textAlign: 'center', marginBottom: theme.spacing(2)}}>
          <CircularProgress />
        </Box>
      )}
      {!searchResult && (
        <Typography className={classes.emptyMessage}>Search for genes and pathways...</Typography>
      )}
      {searchResult && !networkChanging && (
        <Paper variant="outlined" className={classes.contentPaper}>
          <ResultTitle title="pathway" total={searchResult.pathways.length} />
          <PathwayListPanel
            searchTerms={searchTerms}
            items={searchResult.pathways}
            controller={controller}
            onNetworkWillChange={onNetworkWillChange}
            onNetworkChanged={onNetworkChanged}
          />
        </Paper>
      )}
      </DialogContent>
    </Dialog>
  );
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