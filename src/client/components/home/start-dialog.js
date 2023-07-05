import React from 'react';
import PropTypes from 'prop-types';

import UploadPanel from './upload-panel';
import ClassSelector from './class-selector';

import makeStyles from '@mui/styles/makeStyles';

import { Button, Typography } from '@mui/material';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import CircularProgressIcon from '@mui/material/CircularProgress';


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

const StartDialog = ({ step, isMobile, columns, errorMessages, rnaseqClasses, onUpload, onClassesChanged, onSubmit, onCancelled, onBack }) => {
  const classes = useStyles();
  const open = step !== 'WAITING';

  const Classes = () => 
    <ClassSelector 
      columns={columns} 
      rnaseqClasses={rnaseqClasses}
      onClassesChanged={arr => onClassesChanged(arr)}
      isMobile={isMobile}
    />;

  const LoadingProgress = () => 
    <div className={classes.progress}>
      <CircularProgressIcon color="primary" />
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
      {step === 'CLASSES' && (
        <Button variant="outlined" color="primary" startIcon={<NavigateBeforeIcon />} onClick={onBack}>
          Back
        </Button>
      )}
      <span style={{flexGrow: 1}} />
      <Button autoFocus variant="outlined" color="primary" startIcon={step !== 'ERROR' ? <CloseIcon /> : null} onClick={onCancelled}>
        { step === 'ERROR' ? 'OK' : 'Cancel' }
      </Button>
      {step === 'UPLOAD' && (
        <Button variant="contained" color="primary" startIcon={<DescriptionOutlinedIcon />} onClick={onUpload}>
          Upload File
        </Button>
      )}
      {step === 'CLASSES' && (
        <Button variant="contained" color="primary" endIcon={<NavigateNextIcon />} onClick={onSubmit}>
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
  rnaseqClasses: PropTypes.array,
  columns: PropTypes.array,
  errorMessages: PropTypes.array,
  onClassesChanged: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancelled: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default StartDialog;