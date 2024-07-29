import React from 'react';
import makeStyles from '@mui/styles/makeStyles';

import { linkoutProps } from '../defaults';

import { Container, Grid, Link, Typography } from '@mui/material';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';


const useStyles =  makeStyles((theme) => ({
  container: {
    marginTop: 0,
    padding: theme.spacing(1, 4, 2, 6),
    maxWidth: 800,
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    backgroundColor: theme.palette.background.accent,
    border: `1px solid ${theme.palette.text.accent}`,
    borderRadius: 16,
    [theme.breakpoints.down('md')]: {
      padding: theme.spacing(0.5, 1, 1, 4),
      maxWidth: '90%',
    },
  },
  icon: {
    position: 'absolute',
    color: theme.palette.text.accent,
    marginTop: theme.spacing(-0.5),
    marginLeft: theme.spacing(-5),
    width: 30,
    height: 30,
    [theme.breakpoints.down('md')]: {
      marginLeft: theme.spacing(-3.5),
    },
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
        <FormatQuoteIcon className={classes.icon} />
        <Typography variant="body2" className={classes.text}>
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