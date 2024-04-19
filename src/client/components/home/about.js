import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

import { linkoutProps } from '../defaults';
import LinkOut from './link-out';

import { Divider, Link, Typography } from '@material-ui/core';

import WebIcon from '@material-ui/icons/Web';
import { AppLogoIcon, Cy3LogoIcon } from '../svg-icons';


const useStyles = makeStyles(theme => ({
  logo: {
    width: 128,
    height: 'auto',
    marginBottom: theme.spacing(4),
    [theme.breakpoints.down('xs')]: {
      width: 96,
    },
  },
  subtitle: {
    marginBottom: theme.spacing(1.5),
    textAlign: 'left',
    textTransform: 'uppercase',
    color: theme.palette.text.disabled,
  },
  p: {
    marginBottom: theme.spacing(6),
    textAlign: 'left',
  },
  subtitleLogo: {
    marginRight: theme.spacing(1),
    verticalAlign: 'middle',
    color: theme.palette.text.default,
  },
  authors: {
    marginTop: theme.spacing(1),
    textAlign: 'center',
  },
  linkAuthor: {
    color: theme.palette.text.secondary,
  },
}));

export function About() {
  const classes = useStyles();

  return (
    <>
      <div style={{textAlign: 'center'}}>
        <AppLogoIcon className={classes.logo} />
      </div>
      <Typography variant="subtitle2" className={classes.subtitle}><WebIcon className={classes.subtitleLogo} style={{transform: 'scaleX(-1)'}} /> The Web App</Typography>
      <Typography className={classes.p}>
        EnrichmentMap is a web app that allows you to perform functional enrichment analysis on gene lists derived from 
        RNA-seq experiments and visualise the results as a network.
      </Typography>
      <Typography variant="subtitle2" className={classes.subtitle}><Cy3LogoIcon className={classes.subtitleLogo} />The Desktop App</Typography>
      <Typography className={classes.p}>
        EnrichmentMap is also available as an <LinkOut href="https://apps.cytoscape.org/apps/enrichmentmap">App</LinkOut> for the&nbsp;
        <LinkOut href="https://cytoscape.org/">Cytoscape</LinkOut> software&mdash;<LinkOut href="https://enrichmentmap.readthedocs.io/">more info.</LinkOut>
      </Typography>
      <Divider />
      <Typography variant="body2" color="textSecondary" className={classes.authors}>
        EnrichmentMap is authored by:&nbsp;&nbsp;
        <Link href="https://github.com/maxkfranz" className={classes.linkAuthor} {...linkoutProps}>Max Franz</Link>,&nbsp;&nbsp;
        <Link href="https://github.com/mikekucera" className={classes.linkAuthor} {...linkoutProps}>Mike Kucera</Link>,&nbsp;&nbsp;
        <Link href="https://github.com/chrtannus"className={classes.linkAuthor} {...linkoutProps}>Christian Lopes</Link>,&nbsp;&nbsp;
        <Link href="https://baderlab.org" className={classes.linkAuthor} {...linkoutProps}>Gary Bader</Link>.
      </Typography>
    </>
  );
}

export default About;