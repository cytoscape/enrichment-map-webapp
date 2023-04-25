import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from "react-query";


import { linkoutProps } from '../defaults';
import { UploadController } from './upload-controller';
import theme from '../../theme';

import { makeStyles } from '@material-ui/core/styles';

import { ListItem, ListItemText } from '@material-ui/core';
import { Grid, Typography, Link } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  // root: {
  //   width: '100%',
  // },
  // listItem: {
  //   paddingTop: 4,
  //   paddingBottom: 0,
  // },
}));

const UploadPanel = () => {
  const classes = useStyles();

  return (
    <>TODO...</>
  );
};

UploadPanel.propTypes = {
  // controller: PropTypes.instanceOf(UploadController).isRequired,
  // onUpload: PropTypes.func.isRequired,
};

export default UploadPanel;