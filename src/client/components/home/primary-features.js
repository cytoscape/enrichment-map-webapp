import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

import { linkoutProps } from '../defaults';

import { Container, Divider, Link, Typography } from '@material-ui/core';



const useStyles = makeStyles(theme => ({
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
}));

export function PrimaryFeatures() {
  const classes = useStyles();

  return (
    <>
    </>
  );
}

export default PrimaryFeatures;