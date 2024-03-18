import React from 'react';
import PropTypes from 'prop-types';

import { UploadPanel, DemoPanel } from './upload-panel';
import { GeneColumnSelector, RankColumnSelector, ClassSelector } from './column-selector';
import { ColumnType } from './data-file-reader';

import { makeStyles } from '@material-ui/core/styles';

import { Button, Typography } from '@material-ui/core';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@material-ui/core';

import NavigateBeforeIcon from '@material-ui/icons/NavigateBefore';
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import DescriptionOutlinedIcon from '@material-ui/icons/DescriptionOutlined';
import CloseIcon from '@material-ui/icons/Close';
import WarningIcon from '@material-ui/icons/Warning';
import CircularProgressIcon from '@material-ui/core/CircularProgress';


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



const StartDialog = ({ 
  step, isMobile, isDemo, errorMessages, 
  fileType, fileInfo, geneCol, rankCol, rnaseqClasses,
  onGeneColChanged, onRankColChanged, onClassesChanged,
  onUpload, onSubmit, onCancelled, onBack
}) => {
  const classes = useStyles();
  const open = step !== 'WAITING';

  const Columns = () => {
    const columns = fileInfo.numericColumns();
    return <ClassSelector 
      columns={columns} 
      rnaseqClasses={rnaseqClasses}
      onClassesChanged={arr => onClassesChanged(arr)}
      isMobile={isMobile}
    />;
  };

  const GeneColumns = () => <p>Gene Column Selector</p>;
    // <GeneColumnSelector 

    // />;

  const LoadingProgress = () => 
    <div className={classes.progress}>
      <CircularProgressIcon color="primary" />
      <Typography component="p" variant="body1">Preparing your figure...</Typography>
      <Typography component="p" variant="body1">This will take about a minute.</Typography>
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
              <p key={index} style={{whiteSpace: "pre-wrap"}}>{message}</p>
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
          'UPLOAD':  () => isDemo ? 'Create Demo Network' : 'Upload your Data',
          'COLUMNS': () => 'Columns',
          'LOADING': () => 'Loading',
          'ERROR':   () => 'Error',
        }[step]()
      }
      </DialogTitle>
      <DialogContent dividers>
      { 
        {
          'UPLOAD':  () => isDemo ? <DemoPanel /> : <UploadPanel isMobile={isMobile} />,
          'COLUMNS': () => <Columns />,
          'LOADING': () => <LoadingProgress />,
          'ERROR':   () => <ErrorReport />,
        }[step]()
      }
      </DialogContent>
      <DialogActions>
      {step === 'COLUMNS' && (
        <Button variant="outlined" color="primary" 
          startIcon={<NavigateBeforeIcon />} 
          onClick={onBack}
        >
          Back
        </Button>
      )}
      <span style={{flexGrow: 1}} />
      <Button autoFocus variant="outlined" color="primary" 
        startIcon={step !== 'ERROR' ? <CloseIcon /> : null} 
        onClick={onCancelled}
      >
        { step === 'ERROR' ? 'OK' : 'Cancel' }
      </Button>
      {step === 'UPLOAD' && (
        <Button variant="contained" color="primary" 
          startIcon={<DescriptionOutlinedIcon />} 
          onClick={() => isDemo ? onSubmit('demo') : onUpload()}
        >
          { isDemo ? 'Create Network' : 'Upload File' }
        </Button>
      )}
      {step === 'COLUMNS' && (
        <Button variant="contained" color="primary" 
          endIcon={<NavigateNextIcon />} 
          onClick={onSubmit}
        >
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
  isDemo: PropTypes.bool,
  errorMessages: PropTypes.array,

  fileType: PropTypes.string, 
  fileInfo: PropTypes.any, // FileInfo object
  geneCol: PropTypes.string,
  rankCol: PropTypes.string,
  rnaseqClasses: PropTypes.array,
  
  onClassesChanged: PropTypes.func.isRequired,
  onGeneColChanged: PropTypes.func.isRequired,
  onRankColChanged: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancelled: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default StartDialog;