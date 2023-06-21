import React from 'react';
import FormatQuoteIcon from '@material-ui/icons/FormatQuote';
import { Grid, Link, Paper, Typography, Container } from '@material-ui/core';
import { linkoutProps } from '../defaults';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

function EasyCitation({ classes }) {
  return (
    <Grid container direction="column" alignItems="center">
      <Paper className={classes.cite} variant="outlined">
        <FormatQuoteIcon className={classes.citeLogo} />
        <Typography className={classes.citeText}>
          To cite this app in a paper, for now, please cite the Nature Protocols article below.  An article specific to this app will be published shortly.

          <Link className={classes.citeLink} href="https://doi.org/10.1038/s41596-018-0103-9" {...linkoutProps}>
            Reimand, J., Isserlin, R., ..., Bader, G. &nbsp;
            Pathway enrichment analysis and visualization of omics data using g:Profiler, GSEA, Cytoscape and EnrichmentMap.&nbsp;
            Nat Protoc 14, 482–517 (2019).
          </Link>&nbsp;
        </Typography>
      </Paper>
      <Container>
        <Typography className={classes.citeTextAuthors}>
          <span>App authored by: </span>
          <Link href="https://github.com/maxkfranz" className={classes.citeLinkAuthor}>Max Franz</Link><span>, </span>
          <Link href="https://github.com/mikekucera" className={classes.citeLinkAuthor}>Mike Kucera</Link><span>, </span>
          <Link href="https://github.com/chrtannus"className={classes.citeLinkAuthor} >Christian Lopes</Link><span>, </span>
          <span>..., </span>
          <Link href="https://baderlab.org" className={classes.citeLinkAuthor}>Gary Bader</Link>
        </Typography>
      </Container>
    </Grid>
  );
} 

const useStyles = theme => ({
  cite: {
    marginTop: theme.spacing(2),
    marginLeft: theme.spacing(-2),
    padding: theme.spacing(2),
    paddingTop: 0,
    maxWidth: 660,
    textAlign: 'left',
    fontFamily: 'Monaco,Courier New,Monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    [theme.breakpoints.down('xs')]: {
      marginTop: theme.spacing(6),
    },
  },
  citeLogo: {
    position: 'absolute',
    color: theme.palette.background.default,
    marginTop: theme.spacing(-2),
    marginLeft: theme.spacing(-4),
    background: theme.palette.divider,
    borderRadius: '50%',
    width: 30,
    height: 30,
  },
  citeText: {
    marginTop: theme.spacing(2),
    fontSize: '0.85rem',
    color: theme.palette.text.secondary,
    filter: 'opacity(80%)',
  },
  citeTextAuthors: {
    marginTop: theme.spacing(2),
    marginLeft: theme.spacing(-1),
    fontSize: '0.85rem',
    color: theme.palette.text.secondary,
    textAlign: 'center',
    width: '100%'
  },
  citeLink: {
    color: theme.palette.text.secondary,
  },
  citeLinkAuthor: {
    color: theme.palette.text.secondary,
  },
});

EasyCitation.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(useStyles)(EasyCitation);