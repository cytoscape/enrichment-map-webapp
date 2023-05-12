import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';

import theme from '../../theme';
import UploadPanel from './upload-panel';
import ClassSelector from './class-selector';

import { makeStyles } from '@material-ui/core/styles';

import { Container, Paper, Grid, Divider, } from '@material-ui/core';
import { IconButton, Button, Typography } from '@material-ui/core';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@material-ui/core';
import { CircularProgress } from '@material-ui/core';

import WarningIcon from '@material-ui/icons/Warning';


const useStyles = makeStyles(() => ({
  progress: {
    display: 'flex',
    flexDirection: 'column',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 320,
    textAlign: 'center',
  },
}));

const StartDialog = ({ step, isMobile, format, columns, contents, errorMessages, onUpload, onClassesChanged, onSubmit, onCancelled }) => {
  const classes = useStyles();
  const open = step !== 'WAITING';

  const Classes = () => 
    <ClassSelector 
      columns={columns} 
      contents={contents}
      format={format}
      onClassesChanged={arr => onClassesChanged(arr)}
      isMobile={isMobile}
    />;

  const LoadingProgress = () => 
    <div className={classes.progress}>
      <CircularProgress color="primary" />
      <Typography component="p" variant="body1">Preparing your figure...</Typography>
    </div>;

  const ErrorReport = () => {
    return (
      <div className={classes.progress}>
        <WarningIcon fontSize="large" color="error" />
        {
          (!errorMessages || errorMessages.length == 0)
          ? <>
              <Typography variant="body1">We were unable to process your experimental data.</Typography>
              <br />
              <Typography variant="body2" color="secondary">
                Please ensure that your data is formatted properly,<br />either in <i>RNA&#8209;Seq Expression</i> format or in <i>Pre-Ranked Gene</i> format.
              </Typography>
            </>
          : errorMessages.slice(0,7).map((message, index) =>
              <p key={index}>{message}</p>
            )
        }
      </div>
    );
  };

  return (
    <Dialog maxWidth="sm" fullScreen={isMobile} open={open}>
      <DialogTitle>
      {
        {
          'UPLOAD':  () => 'Upload your Data',
          'CLASSES': () => 'Groups',
          'LOADING': () => 'Loading',
          'ERROR':   () => 'Error',
        }[step]()
      }
      </DialogTitle>
      <DialogContent dividers>
      { 
        {
          'UPLOAD':  () => <UploadPanel isMobile={isMobile} />,
          'CLASSES': () => <Classes />,
          'LOADING': () => <LoadingProgress />,
          'ERROR':   () => <ErrorReport />,
        }[step]()
      }
      </DialogContent>
      <DialogActions>
        <Button autoFocus variant="outlined" color="primary" onClick={onCancelled}>
          { step == 'ERROR' ? 'OK' : 'Cancel' }
        </Button>
        {step == 'UPLOAD' && (
          <Button variant="contained" color="primary" onClick={() => onUpload()}>
            Upload File
          </Button>
        )}
        {step == 'CLASSES' && (
          <Button variant="contained" color="primary" onClick={() => onSubmit()}>
            Submit
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

StartDialog.propTypes = {
  step: PropTypes.string.isRequired,
  isMobile: PropTypes.bool,
  format: PropTypes.string,
  columns: PropTypes.array,
  contents: PropTypes.string,
  errorMessages: PropTypes.array,
  onClassesChanged: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancelled: PropTypes.func.isRequired,
};

export default StartDialog;