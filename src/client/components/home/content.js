import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { readTextFile, readExcelFile } from './data-file-reader';
import ClassSelector from './class-selector';
import { InfoPanel } from './info-panel';
import { DebugMenu } from '../../debug-menu';

import { SENTRY } from '../../env';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Button, Toolbar } from '@material-ui/core';
import { Grid } from '@material-ui/core';
import { Tooltip, Typography, Link } from '@material-ui/core';

import { CircularProgress, IconButton } from '@material-ui/core';
import WarningIcon from '@material-ui/icons/Warning';
import { AppLogoIcon } from '../svg-icons';

import * as Sentry from "@sentry/browser";

import classNames from 'classnames';

const STEP = {
  WAITING: 'WAITING',
  LOADING: 'LOADING',
  CLASSES: 'CLASSES',
  ERROR:   'ERROR'
};

const FILE_EXT_REGEX = /\.[^/.]+$/;
const TSV_EXTS = ['txt', 'rnk', 'tsv', 'csv', 'gct'];
const EXCEL_EXTS = ['xls', 'xlsx'];

// globally cached
let sampleFiles = [];
let sampleRankFiles = [];
let sampleExpressionFiles = [];

class NondescriptiveHandledError extends Error { // since we don't have well-defined errors
  constructor(message) {
    message = message ?? 'A non-descriptive error occurred.  Check the attached file.';
    super(message);
  }
}

const captureNondescriptiveErrorInSentry = (errorMessage) => {
  if (SENTRY) {
    Sentry.captureException(new NondescriptiveHandledError(errorMessage));
    console.error('Reporting browser error to Sentry: ' + errorMessage);
  }
};

export class Content extends Component {

  constructor(props) {
    super(props);

    this.state = {
      step: STEP.WAITING,
      errorMessages: null,
      sampleFiles,
      sampleRankFiles,
      sampleExpressionFiles,
      isDroppingFile: false
    };
  }

  componentDidMount() {
    this.loadSampleFiles();
  }

  async loadSampleFiles() {
    if (sampleFiles.length > 0) { return; } // already loaded

    const res = await fetch('/api/sample-data');
    const files = await res.json();

    sampleFiles = files;
    sampleRankFiles = files.filter(f => f.endsWith('.rnk'));
    sampleExpressionFiles = files.filter(f => !f.endsWith('.rnk'));

    this.setState({ sampleFiles, sampleRankFiles, sampleExpressionFiles }); // re-render on load
  }

  showNetwork(id, secret) {
    // location.href = `/document/${id}/${secret}`;
    location.href = `/document/${id}`;
  }

  async sendDataToEMService(text, format, type, networkName, classesArr) {
    let url;
    if(type === 'ranks') {
      url = '/api/create/preranked?' + new URLSearchParams({ networkName });
    } else if(type === 'rnaseq') {
      const classes = classesArr.join(',');
      url = '/api/create/rnaseq?' + new URLSearchParams({ classes, networkName });
    } 

    const contentType = format === 'tsv' ? 'text/tab-separated-values' : 'text/csv';
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: text
    });

    if(res.ok) {
      const netID = await res.text();
      return { netID };
    } else if(res.status == 413) {
      // Max file size for uploads is defined in the tsvParser in the server/routes/api/index.js file.
      return { errors: ["The uploaded file is too large. The maximum file size is 50 MB." ] };
    } else {
      return { errors: [] }; // empty array shows generic error message
    }
  }


  async onLoadSampleNetwork(fileName) {
    const dataurl = `/sample-data/${fileName}`;
    const sdRes = await fetch(dataurl);
    if(!sdRes.ok) {
      this.setState({ step: STEP.ERROR, errorMessages: ["Error loading sample network"] });
      captureNondescriptiveErrorInSentry('Error loading sample network');
      return;
    }
    
    const data = await sdRes.text();

    const file = new File([data], fileName, { type: 'text/plain' });
    await this.onDropzoneFileLoad([file]);
  }


  async onDropzoneFileLoad(files) {
    // This is just for ranks TSV for now
    if(this.state.step == STEP.LOADING)
      return;

    const file = files && files.length > 0 ? files[0] : null;
    if(!file)
      return;
   
    this.setState({ step: STEP.LOADING });
    const name = file.name.replace(FILE_EXT_REGEX, '');
    const ext  = file.name.split('.').pop().toLowerCase();

    if (SENTRY) {
      const attachmentName = file.name;
      const attachmentContentType = file.type;
      const arrayBuffer = await file.arrayBuffer();
      const attachmentData = new Uint8Array(arrayBuffer);

      Sentry.configureScope(scope => {
        scope.clearAttachments();
        scope.addAttachment({ filename: attachmentName, data: attachmentData, contentType: attachmentContentType });
      });
    }

    try {
      if(TSV_EXTS.includes(ext)) {
        console.log('Reading file');
        const { type, format, columns, contents } = await readTextFile(file);
        console.log(`Reading ${format} file as ${type}, columns: ${columns}`);
  
        if(type === 'ranks') {
          const emRes = await this.sendDataToEMService(contents, format, 'ranks', name);
          if(emRes.errors) {
            this.setState({ step: STEP.ERROR, errorMessages: emRes.errors });
            captureNondescriptiveErrorInSentry('Error in EM service with uploaded rank file');
            return;
          }
          this.showNetwork(emRes.netID);
    
        } else {
          this.setState({ step: STEP.CLASSES, format, columns, contents, name });
        }

      } else if(EXCEL_EXTS.includes(ext)) {
        const { columns, contents, format } = await readExcelFile(file);
        console.log(`Reading Excel file, columns: ${columns}`);
        this.setState({ step: STEP.CLASSES, format, columns, contents, name });
      } else {
        const exts = TSV_EXTS.join(', ') + ', ' + EXCEL_EXTS.join(', ');
        this.setState({ step: STEP.ERROR, errorMessages: ["File extension not supported. Must be one of: " + exts]});
      }

    } catch(e) {
      this.setState({ step: STEP.ERROR, errorMessages: [e] });
      captureNondescriptiveErrorInSentry('Some error in handling uploaded file:' + e.message);
      return;
    }
  }


  async onRnaseqClassSubmit(classes) {
      const { format, contents, name } = this.state;
      this.setState({ step: STEP.LOADING });
      
      const emRes = await this.sendDataToEMService(contents, format, 'rnaseq', name, classes);
      if(emRes.errors) {
        this.setState({ step: STEP.ERROR, errorMessages: emRes.errors, contents: null });
        captureNondescriptiveErrorInSentry('Error in sending uploaded RNASEQ data to service');
        return;
      }
      this.showNetwork(emRes.netID);
  }


  async onDropUpload(event) {
    event.preventDefault();

    const files = (
      Array.from(event.dataTransfer.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
    );

    this.setState({ isDroppingFile: false });

    await this.onDropzoneFileLoad(files);
  }

  onDragOverUpload(event) {
    event.preventDefault();

    this.setState({ isDroppingFile: true });
  }

  onDragEndUpload(event) {
    event.preventDefault();

    this.setState({ isDroppingFile: false });
  }

  async showFileDialog() {
    var input = document.createElement('input');
    input.type = 'file';

    return await new Promise(resolve => {
      input.addEventListener('change', () => {
        const files = input.files;
  
        resolve(files);
      });
  
      input.click();
    });
  }

  async onClickUpload(event) {
    const files = await this.showFileDialog();
    await this.onDropzoneFileLoad(files);
  }


  render() {
    const { classes } = this.props;
    const { isDroppingFile } = this.state;

    return (
      <div className={classNames({ [classes.root]: true, [classes.rootDropping]: isDroppingFile })}>
        { this.renderMain() }
        { this.renderDebug() }
      </div>
    );
  }

  renderMain() {
    const { classes } = this.props;
    
    const RanksDropArea = () => (
      <div className={classes.dropzone}>
        <Grid container className={classes.header} direction="row" alignItems="center" justifyContent="center" spacing={2}>
          <Grid item>
            <AppLogoIcon className={classes.logo} />
          </Grid>
          <Grid item>
            EnrichmentMap
          </Grid>
        </Grid>
        <p className={classes.tagline}>Get a quick-and-easy, publication-ready enrichment figure for your two-case RNA-Seq experiment.</p>
        <InfoPanel />
        <Button className={classes.uploadButton} onClick={e => this.onClickUpload(e)} variant="contained" color="primary">Upload RNA-Seq data</Button>
      </div>
    );

    const LoadingProgress = () => 
      <div className={classes.spinner}>
        <CircularProgress color="secondary" />
        <p>Preparing your figure.</p>
      </div>;

    const ErrorReport = () => {
      const { errorMessages } = this.state;
      return <div className={classes.spinner}>
        <WarningIcon fontSize='large'/>
        {
          (!errorMessages || errorMessages.length == 0)
          ? <p>We were unable to process your experimental data. Please ensure that your data is formatted properly, either in differential expression format or in ranked gene format.</p>
          : errorMessages.slice(0,7).map((message, index) =>
              <p key={index}>{message}</p>
            )
        }
        <Button variant='outlined' onClick={() => this.setState({ step: STEP.WAITING, errorMessages: null })}>OK</Button>
      </div>;
    };

    const Classes = () =>
      <ClassSelector 
        columns={this.state.columns} 
        onSubmit={classes => this.onRnaseqClassSubmit(classes)} 
        onCancel={() => this.setState({ step: STEP.WAITING, columns:null, contents:null, name:null, errorMessages:null })} />;

    return (
      <div className={classes.main} 
        onDrop={e => this.onDropUpload(e)} 
        onDragOver={e => this.onDragOverUpload(e)} 
        onDragLeave={e => this.onDragEndUpload(e)} 
        onDragEnd={e => this.onDragEndUpload(e)} >
        { 
          { 'WAITING': () => <RanksDropArea />,
            'LOADING': () => <LoadingProgress />,
            'ERROR':   () => <ErrorReport />,
            'CLASSES': () => <Classes />,
          }[this.state.step]()
        }
      </div>
    );
  }

  renderDebug() {
    const { sampleRankFiles } = this.state;

    return (
      <DebugMenu>
        <h3>Example rank input files</h3>
        <ul>
          {
            sampleRankFiles.length > 0 ?
            sampleRankFiles.map(file => (
              <li key={file}><Link component="a" style={{ cursor: 'pointer' }}  onClick={() => this.onLoadSampleNetwork(file)}>{file}</Link></li>
            )) :
            <li>Loading...</li>
          }
        </ul>
        <h3>Example expression input files</h3>
        <ul>
          {
            sampleExpressionFiles.length > 0 ?
            sampleExpressionFiles.map(file => (
              <li key={file}><Link component="a" style={{ cursor: 'pointer' }}  onClick={() => this.onLoadSampleNetwork(file)}>{file}</Link></li>
            )) :
            <li>Loading...</li>
          }
        </ul>
      </DebugMenu>
    );
  }

  renderHeader() {
    const { classes } = this.props;

    return (
      <AppBar position="static" color='default'>
        <Toolbar variant="regular">
          <Grid container alignItems='center' justifyContent="space-between">
            <Grid item>
              <Grid container alignItems='center'>
                <Grid item>
                  <Tooltip arrow placement="bottom" title="Home">
                    <IconButton aria-label='close' onClick={() => location.href = '/'} >
                      <AppLogoIcon fontSize="large" />
                    </IconButton>
                  </Tooltip>
                </Grid>
                <Grid item>
                  <Typography variant="h5" className={classes.h5}>EnrichmentMap</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>
    );
  }
}


const useStyles = theme => ({
  root: {
    alignContent: 'center',
    height: '100%',
    width: '100%',
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    border: '4px solid transparent'
  },
  rootDropping: {
    borderColor: 'rgb(54, 102, 209)'
  },
  header: {
    fontSize: '1.5em',
    fontWeight: 'bold',
  },
  main: {
    padding: theme.spacing(1),
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropzone: {
    display: 'flex',
    flexDirection: 'column',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  spinner: {
    display: 'flex',
    flexDirection: 'column',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '20em',
    textAlign: 'center'
  },
  uploadButton: {
    fontSize: '1.25em',
    marginTop: '1.5em',
    textTransform: 'unset',
  },
  logo: {
    fontSize: 48,
  },
  tagline: {
    fontSize: '1rem',
    color: theme.palette.secondary.main,
  }
});

Content.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(useStyles)(Content);