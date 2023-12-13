import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

import { linkoutProps } from '../defaults';

import { Container, Grid, Link, Typography } from '@material-ui/core';
import FormatQuoteIcon from '@material-ui/icons/FormatQuote';


const useStyles =  makeStyles((theme) => ({
  cite: {
    marginTop: 0,
    padding: theme.spacing(1, 4, 2, 6),
    maxWidth: 660,
    textAlign: 'left',
    fontFamily: 'Monaco,Courier New,Monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    backgroundColor: theme.palette.background.accent,
    borderRadius: 18,
    [theme.breakpoints.down('sm')]: {
      marginTop: theme.spacing(2),
    },
    [theme.breakpoints.down('xs')]: {
      marginTop: theme.spacing(4),
    },
  },
  citeLogo: {
    position: 'absolute',
    color: theme.palette.text.accent,
    marginTop: theme.spacing(-0.5),
    marginLeft: theme.spacing(-5),
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
}));

function EasyCitation() {
  const classes = useStyles();

  return (
    <Grid container direction="column" alignItems="center">
      <Container className={classes.cite}>
        <FormatQuoteIcon className={classes.citeLogo} />
        <Typography className={classes.citeText}>
          To cite this app in a paper, for now, please cite this Nature Protocols article (an article specific to this app will be published shortly):
          &nbsp;&nbsp;
          <Link className={classes.citeLink} href="https://doi.org/10.1038/s41596-018-0103-9" {...linkoutProps}>
            Reimand, J., Isserlin, R., ..., Bader, G. &nbsp;
            Pathway enrichment analysis and visualization of omics data using g:Profiler, GSEA, Cytoscape and EnrichmentMap.&nbsp;
            Nat Protoc 14, 482–517 (2019).
          </Link>&nbsp;
        </Typography>
      </Container>
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

export default EasyCitation;