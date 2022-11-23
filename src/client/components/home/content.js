import React, { Component } from 'react';
import PropTypes from 'prop-types';

import RecentNetworksGrid from './recent-networks-grid';
import ClassSelector from './class-selector';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Button, Toolbar } from '@material-ui/core';
import { Grid, Container } from '@material-ui/core';
import { Tooltip, Typography, Link } from '@material-ui/core';
import { CircularProgress, IconButton } from '@material-ui/core';
import WarningIcon from '@material-ui/icons/Warning';
import { AppLogoIcon } from '../svg-icons';
import { DebugMenu } from '../../debug-menu';
import classNames from 'classnames';


const STEP = {
  WAITING: 'WAITING',
  LOADING: 'LOADING',
  CLASSES: 'CLASSES',
  ERROR:   'ERROR'
};

const FILE_EXT_REGEX = /\.[^/.]+$/;

// globally cached
let sampleFiles = [];
let sampleRankFiles = [];
let sampleExpressionFiles = [];

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

  async sendDataToEMService(dataTSV, type, networkName, classesArr) {
    const init = {
      method: 'POST',
      headers: { 'Content-Type': 'text/tab-separated-values' },
      body: dataTSV
    };

    let res;
    if(type === 'ranks') {
      res = await fetch('/api/create/preranked', init);
    } else if(type === 'rnaseq') {
      const classes = classesArr.join(',');
      const url =  '/api/create/rnaseq?' + new URLSearchParams({ classes });
      res = await fetch(url, init);
    } 

    if(res.ok) {
      // Update the network name
      const netID = await res.text();
      
      // TODO We should pass the network name as a query parameter to the first
      // fetch call above, then this extra fetch won't be necessary.
      await fetch(`/api/${netID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ networkName })
      });

      return { netID };
    } else if(res.status == 413) {
      // Max file size for uploads is defined in the tsvParser in the server/routes/api/index.js file.
      return { errors: ["The uploaded file is too large. The maximum file size is 50 MB." ] };
    } else {
      return { errors: [] }; // empty array shows generic error message
    }
  }


  async onLoadSampleNetwork(file) {
    if(this.state.step == STEP.LOADING)
      return;

    this.setState({ step: STEP.LOADING });

    const ext = file.split('.').pop();
    const type = ext === 'rnk' ? 'ranks' : 'rnaseq';

    const name = file;
    const classes = ['A','A','A','B','B','B'];

    const dataurl = `/sample-data/${name}`;
    const sdRes = await fetch(dataurl);
    if(!sdRes.ok) {
      this.setState({ step: STEP.ERROR, errorMessages: ["Error loading sample network"] });
      return;
    }
    
    const data = await sdRes.text();
    const emRes = await this.sendDataToEMService(data, type, name, classes);
    if(emRes.errors) {
      this.setState({ step: STEP.ERROR, errorMessages: emRes.errors });
      return;
    }

    this.showNetwork(emRes.netID);
  }


  async onDropzoneFileLoad(files) {
    // This is just for ranks TSV for now
    if(this.state.step == STEP.LOADING)
      return;

    const file = files && files.length > 0 ? files[0] : null;
    if(!file)
      return;
   
    this.setState({ step: STEP.LOADING });

    const contents = await this.readTextFile(file);
    let { type, columns, errors } = await this.validateRnaseqOrRanks(contents);

    if(errors) {
      this.setState({ step: STEP.ERROR, errorMessages: errors });
      return;
    }

    const name = file.name.replace(FILE_EXT_REGEX, '');

    if(type === 'ranks') {
      const emRes = await this.sendDataToEMService(contents, "ranks", name);
      if(emRes.errors) {
        this.setState({ step: STEP.ERROR, errorMessages: emRes.errors });
        return;
      }
      this.showNetwork(emRes.netID);

    } else {
      this.setState({ step: STEP.CLASSES, columns, contents, name });
    }
  }


  async onRnaseqClassSubmit(classes) {
      const { contents, name } = this.state;
      this.setState({ step: STEP.LOADING });
      
      const emRes = await this.sendDataToEMService(contents, 'rnaseq', name, classes);
      if(emRes.errors) {
        this.setState({ step: STEP.ERROR, errorMessages: emRes.errors, contents: null });
        return;
      }
      this.showNetwork(emRes.netID);
  }


  readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = evt => resolve(evt.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }


  async validateRnaseqOrRanks(contents) {
    const firstLine = contents.split('\n', 1)[0];
    const headers = firstLine.split('\t');
    const columns = headers.filter(h => h.toLowerCase() != "description" && h.toLowerCase() != "name");

    if(headers.length == 2) {
      return { type: 'ranks', columns };
    }
    if(headers.length > 2) {
      return { type: 'rnaseq', columns };
    }
    return { errors: [] };
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
        <div className={classes.header}>
          <AppLogoIcon className={classes.logo} fontSize="large" />
        </div>

        <p className={classes.tagline}>Get a quick-and-easy, publication-ready enrichment figure for your two-case RNA-Seq experiment.</p>
        
        <Button className={classes.uploadButton} onClick={e => this.onClickUpload(e)} variant="outlined" color="primary">Enrich my RNA-Seq data</Button>
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

    return (
      <div className={classes.main} onDrop={e => this.onDropUpload(e)} onDragOver={e => this.onDragOverUpload(e)} onDragLeave={e => this.onDragEndUpload(e)} onDragEnd={e => this.onDragEndUpload(e)}>
        { {'WAITING': () => <RanksDropArea />,
            'LOADING': () => <LoadingProgress />,
            'ERROR':   () => <ErrorReport />,
            'CLASSES': () => <ClassSelector columns={this.state.columns} onSubmit={classes => this.onRnaseqClassSubmit(classes)} />,
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

  },
  main: {
    // backgroundColor: 'cyan',
    padding: theme.spacing(1),
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropzone: {
    // backgroundColor: 'yellow',
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
    marginTop: '1.5em'
  },
  logo: {
    transform: 'scale(2)'
  },
  tagline: {
    // maxWidth: '18em',
    // background: 'red'
  }
});

Content.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(useStyles)(Content);