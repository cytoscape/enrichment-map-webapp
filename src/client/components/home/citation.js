import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

import { linkoutProps } from '../defaults';

import { Container, Grid, Link, Typography } from '@material-ui/core';
import FormatQuoteIcon from '@material-ui/icons/FormatQuote';


const useStyles =  makeStyles((theme) => ({
  container: {
    marginTop: 0,
    padding: theme.spacing(1, 4, 2, 6),
    maxWidth: 800,
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.text.accent}`,
    borderRadius: 16,
    [theme.breakpoints.down('sm')]: {
      marginTop: theme.spacing(2),
    },
    [theme.breakpoints.down('xs')]: {
      marginTop: theme.spacing(4),
    },
  },
  logo: {
    position: 'absolute',
    color: theme.palette.text.accent,
    marginTop: theme.spacing(-0.5),
    marginLeft: theme.spacing(-5),
    width: 30,
    height: 30,
  },
  text: {
    marginTop: theme.spacing(2),
    color: theme.palette.text.secondary,
  },
  link: {
    color: theme.palette.text.secondary,
  },
}));

function Citation() {
  const classes = useStyles();

  // IMPORTANT: This text is also included in the README.md file that's part of the data export.
  // If you change the text here it needs to be changed there as well.
  return (
    <Grid container direction="column" alignItems="center">
      <Container className={classes.container}>
        <FormatQuoteIcon className={classes.logo} />
        <Typography className={classes.text}>
          <Link className={classes.link} href="https://doi.org/10.1038/s41596-018-0103-9" {...linkoutProps}>
            Reimand, J., Isserlin, R., ..., Bader, G. &nbsp;
            Pathway enrichment analysis and visualization of omics data using g:Profiler, GSEA, Cytoscape and EnrichmentMap.&nbsp;
            Nat Protoc 14, 482–517 (2019).
          </Link>&nbsp;
        </Typography>
      </Container>
    </Grid>
  );
}

export default Citation;