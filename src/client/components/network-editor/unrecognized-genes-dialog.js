import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import clsx from 'clsx';
import chroma from 'chroma-js';
import copy from 'copy-to-clipboard';

import { LinkOut } from '../link-out';

import { makeStyles } from '@material-ui/core/styles';

import { Virtuoso } from 'react-virtuoso';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  ListItem,
  Snackbar,
  SnackbarContent,
  Typography,
} from '@material-ui/core';

import CloseIcon from '@material-ui/icons/Close';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { ContentCopyIcon } from '../svg-icons';


const useStyles = makeStyles((theme) => ({
  paper: {
    width: 500,
  },
  dialogContent: {
    padding: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
  },
  accordion: {
    margin: `${theme.spacing(0.5, 0)} !important`,
  },
  accordionSummaryRoot: {
    paddingLeft: theme.spacing(3),
  },
  accordionSummaryContent: {
    alignItems: 'center',
    margin: `${theme.spacing(0.5, 0)} !important`,
  },
  accordionSummaryExpanded: {
    alignItems: 'flex-start',
  },
  accordionDetails: {
    height: 250,
    padding: 0,
  },
  infoBox: {
    marginRight: theme.spacing(2),
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.background.default,
    borderRadius: 8,
  },
  infoBoxInfo: {
    backgroundColor: chroma(theme.palette.info.light).alpha(0.1).css(),
  },
  infoBoxWarning: {
    backgroundColor: chroma(theme.palette.warning.light).alpha(0.1).css(),
  },
  infoBoxError: {
    backgroundColor: chroma(theme.palette.error.light).alpha(0.1).css(),
  },
  subtitle: {
    [theme.breakpoints.down('xs')]: {
      fontSize: theme.typography.body2.fontSize,
    },
  },
  info: {
    marginTop: theme.spacing(1),
    fontSize: theme.typography.caption.fontSize,
  },
  listItem: {
    display: "list-item",
    listStyleType: "none",
    fontSize: theme.typography.caption.fontSize,
    color: theme.palette.text.disabled,
    paddingTop: theme.spacing(0.25),
    paddingBottom: theme.spacing(0.25),
  },
  count: {
    display: 'inline-block',
    minWidth: 40,
    fontSize: theme.typography.caption.fontSize,
    color: theme.palette.text.disabled,
    textAlign: 'right',
    marginRight: theme.spacing(1),
  },
  symbol: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.palette.text.secondary,
    padding: theme.spacing(0.25, 1),
  },
  arrow: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.palette.text.disabled,
    padding: theme.spacing(0.25, 0.5, 0.25, 0.5),
  },
  ensemblID: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.palette.text.secondary,
    padding: theme.spacing(0.25, 1),
  },
  ensemblIDWithSymbol: {
    color: theme.palette.text.disabled,
  },
  snackBar: {
    top: '10px',
  },
}));

export const UnrecognizedGenesDialog = ({ open, genes, title, isMobile, onClose }) => {
  const [ expandedList, setExpandedList ] = useState();
  const [ isCopied, setCopied ] = useState(false);
  
  const classes = useStyles();

  const invalidGenes = genes.filter(g => g.ensemblID != null && g.symbol == null);
  const unrecognizedGenes = genes.filter(g => g.symbol != null);
  
  useEffect(() => {
    if (open) {
      const defExpanded = invalidGenes.length > 0 ? 'invalid' : unrecognizedGenes.length > 0 ? 'unrecognized' : null;
      setExpandedList(defExpanded);
    }
  }, [open]);

  const handleCopy = (evt, geneList) => {
    evt.stopPropagation(); // To prevent the accordion from closing
    // Create a tab-separated string of the gene list
    const text = geneList.map(g => {
      if (g.ensemblID) {
        if (g.symbol) {
          return `${g.symbol}\t${g.ensemblID}`;
        } else {
          return g.ensemblID;
        }
      }
      return g.symbol;
    }).join('\n');
    // Perform the copy directly, because we can't pass the text to useClipboard
    const success = copy(text);
    if (success) {
      // Set the last copied text to trigger useClipboard
      setCopied(true);
    } else {
      console.error('Failed to copy gene list to clipboard!');
    }
  };
  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  const renderGeneRow = (idx, list) => {
    const gene = list[idx];

    return (
      <ListItem key={idx} className={classes.listItem}>
        <Typography component="span" className={classes.count}>
          { idx + 1 }.
        </Typography>
      {list[idx].symbol && (
        <Typography component="span" className={classes.symbol} width={gene.ensemblID ? 400 : 'auto'}>
          { gene.symbol || '-' }
        </Typography>
      )}
      {list[idx].ensemblID && (
      <>
        {gene.symbol && (
          <Typography component="span" className={classes.arrow}>
            &nbsp;&#8592;&nbsp;
          </Typography>
        )}
        <Typography component="span" className={clsx(classes.ensemblID, { [classes.ensemblIDWithSymbol]: genes[idx].symbol })}>
          { gene.ensemblID }
        </Typography>
      </>
      )}
      </ListItem>
    );
  };

  const renderGeneListContent = (list, title, info, level, expanded, onChange) => {
    return (
      <>
      {info && (
        <Accordion
          expanded={expanded}
          variant="outlined"
          classes={{ root: classes.accordion, expanded: classes.accordion }}
          onChange={onChange}
        >
          <AccordionSummary
            id="panel1a-header"
            expandIcon={<ExpandMoreIcon />}
            classes={{
              root: classes.accordionSummaryRoot,
              content: classes.accordionSummaryContent,
              expanded: classes.accordionSummaryExpanded
            }}
          >
            <Grid
              container
              direction="column"
              justifyContent="flex-start"
              alignItems="flex-start"
              spacing={1}
            >
              <Grid item>
                <Typography
                  component="span"
                  variant="subtitle1"
                  color="textPrimary"
                  className={classes.subtitle}
                >
                  { title }
                </Typography>
                <Typography
                  component="span"
                  variant="subtitle2"
                  color="textSecondary"
                  className={classes.subtitle}
                  style={{ marginLeft: 8 }}
                >
                  ({list.length})
                </Typography>
              </Grid>
            {expanded && (
              <Grid item>
                <Box className={clsx(classes.infoBox, classes[`infoBox${_.capitalize(level)}`])}>
                  <Typography component="p" variant="caption" color="textSecondary" className={classes.info}>
                    { info }
                  </Typography>
                  <Button
                    size="small"
                    color="primary"
                    startIcon={<ContentCopyIcon fontSize="small" />}
                    onClick={(evt) => handleCopy(evt, list)}
                  >
                    Copy to clipboard
                  </Button>
                </Box>
              </Grid>
            )}
            </Grid>
          </AccordionSummary>
          <AccordionDetails className={classes.accordionDetails}>
            <Virtuoso
              totalCount={list.length}
              overscan={100}
              itemContent={idx => renderGeneRow(idx, list)}
              style={{ width: '100%' }}
            />
          </AccordionDetails>
        </Accordion>
      )}
      </>
    );
  };
  
  return (
    <Dialog open={open} fullScreen={isMobile} onClose={handleClose} classes={{ paper: classes.paper }}>
      <DialogTitle>
        { title }
      </DialogTitle>
      <DialogContent dividers className={classes.dialogContent}>
      {invalidGenes.length > 0 && (
        renderGeneListContent(
          invalidGenes,
          `Invalid Ensembl ID${invalidGenes.length > 1 ? 's' : ''}`,
          <>
            These Ensembl IDs could not be translated to gene symbols.<br />
            Please check the spelling or try updating your Ensembl IDs <LinkOut href="https://useast.ensembl.org/Help/View?db=core;id=560#:~:text=The%20ID%20history%20converter%20allows,Ensembl%20IDs%2C%20which%20begin%20ENS">here</LinkOut>.
          </>,
          'warning',
          expandedList === 'invalid',
          () => setExpandedList(expandedList === 'invalid' ? null : 'invalid')
        )
      )}
      {unrecognizedGenes.length > 0 && (
        renderGeneListContent(
          unrecognizedGenes,
          `Symbols not Found`,
          // If there are any ensemblIDs in the list, show a different message,
          // because this just means that these symbols are not in our database (GMT file),
          // since they have been input as EnsemblIDs and then validated when BridgeDB translated them to symbols.
          unrecognizedGenes[0].ensemblID ?
            <>
              These gene symbols were translated from your Ensembl IDs, but are not
              in our <LinkOut href="https://baderlab.org/GeneSets">database of known pathways</LinkOut>.
            </>
            :
            <>
              These gene symbols are not in our <LinkOut href="https://baderlab.org/GeneSets">database of known pathways</LinkOut>.<br />
              In any case, please make sure that the spelling is correct.
            </>,
          'warning',
          expandedList === 'unrecognized',
          () => setExpandedList(expandedList === 'unrecognized' ? null : 'unrecognized')
        )
      )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary" variant="outlined">
          Close
        </Button>
      </DialogActions>
      <Snackbar
        className={classes.snackBar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={isCopied} 
        autoHideDuration={3000}
        onClose={() => setCopied(false)}
      >
        <SnackbarContent 
          message="Gene list copied to clipboard"
          action={
            <IconButton size='small' color="inherit" onClick={() => setCopied(false)}>
              <CloseIcon />
            </IconButton>
          }
        />
      </Snackbar>
    </Dialog>
  );
};
UnrecognizedGenesDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  genes: PropTypes.array.isRequired,
  title: PropTypes.string.isRequired,
  isMobile: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

export default UnrecognizedGenesDialog;