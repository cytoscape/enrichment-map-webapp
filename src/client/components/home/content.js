import React, { Component } from 'react';
import PropTypes from 'prop-types';

import RecentNetworksGrid from './recent-networks-grid';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Button, Toolbar } from '@material-ui/core';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import { Grid, Container } from '@material-ui/core';
import { Tooltip, Typography, Link } from '@material-ui/core';
import { CircularProgress, IconButton } from '@material-ui/core';
import { DropzoneArea } from 'material-ui-dropzone';
import WarningIcon from '@material-ui/icons/Warning';
import { AppLogoIcon } from '../svg-icons';


const STEP = {
  WAITING: 'WAITING',
  LOADING: 'LOADING',
  CLASSES: 'CLASSES',
  ERROR:   'ERROR'
};

const FILE_EXT_REGEX = /\.[^/.]+$/;

export class Content extends Component {

  constructor(props) {
    super(props);

    this.state = {
      step: STEP.WAITING,
      errorMessages: null
    };
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
      console.log(url);
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
    } else {
      return { errors: ["Error running EnrichmentMap service."]};
    }
  }


  async onLoadSampleNetwork(type, size) {
    if(this.state.step == STEP.LOADING)
      return;

    this.setState({ step: STEP.LOADING });

    let name, classes;
    if(type === 'ranks') {
      name = size == 'small'  ? 'brca_hd_tep_ranks_100.rnk' : 'brca_hd_tep_ranks.rnk';
    } else if(type === 'rnaseq') {
      name = 'FakeExpression.txt';
      classes = ['A','A','A','B','B','B'];
    }

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
      const classes = columns.map((c,i) => i < columns.length / 2 ? 'A' : 'B');
      console.log(columns);
      console.log(classes);
      this.setState({ step: STEP.CLASSES, columns, classes, contents, name });
    }
  }


  async onRnaseqClassSubmit() {
      const { classes, contents, name } = this.state;
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
    return { errors: ['Not an expression or ranks file.'] };
  }


  render() {
    const { classes } = this.props;

    const DropArea = () =>
      <DropzoneArea
        //acceptedFiles={['text/plain']} // no idea how to get this to accept .rnk files
        classes={{root: classes.dropzone}}
        filesLimit={1}
        maxFileSize={31457280}
        onChange={files => this.onDropzoneFileLoad(files)}
        dropzoneText='Provide a RNA-seq expression file or ranked-gene-list file. Drag and Drop or click.'
        showPreviews={false}
        showPreviewsInDropzone={false}
      />;

    const LoadingProgress = () => 
      <div className={classes.spinner}>
        <CircularProgress />
        <Typography>Running Enrichment Analysis and Building Network.</Typography>
      </div>;

    const ClassSelector = () =>
      <div>
        <b>Choose Classes</b>
        { this.state.columns.map((col, i) =>
            <div key={col}>
              { col } &nbsp;
              <ToggleButtonGroup 
                exclusive
                value={this.state.classes[i]} 
                onChange={(e, newClass) =>
                  this.setState({ classes: this.state.classes.map((c, i2) => i == i2 ? newClass : c) })
                }>
                <ToggleButton value='A'>A</ToggleButton>
                <ToggleButton value='B'>B</ToggleButton>
                <ToggleButton value='X'>X</ToggleButton>
              </ToggleButtonGroup>
            </div>
        )}
        <Button variant='outlined' onClick={() => this.onRnaseqClassSubmit()}>
          Submit
        </Button>
      </div>;

    const ErrorReport = () =>
      <div className={classes.spinner}>
        <WarningIcon fontSize='large'/>
        { this.state.errorMessages.slice(0,7).map((message, index) =>
          <Typography key={index}>{message}</Typography>
        )}
        <br />
        <Button variant='outlined' onClick={() => this.setState({ step: STEP.WAITING, errorMessages: null })}>
          Retry
        </Button>
      </div>;

    return (
      <div className={classes.root} style={{ height: '100%' }}>
        { this.renderHeader() }
        <div className={classes.root} style={{ height: '100%', overflowY: 'scroll' }}>
          <Grid container direction="column" alignItems="stretch" alignContent="stretch" justifyContent="flex-start">
            { /* === TOP Panel ==================================================================== */ }
            <Grid item>
              <Grid container direction="row" alignItems="stretch" alignContent="stretch" justifyContent="center">
                { /* === LEFT Panel ===================================================== */ }
                <Grid item className={classes.root}>
                  <Container direction="column" className={classes.container}>
                    <Typography variant="body1" gutterBottom className={classes.body1}>
                      Create EnrichmentMap networks with This Website. <br />
                      <br />
                    </Typography>
                    <div>
                      { {'WAITING': () => <DropArea />,
                         'LOADING': () => <LoadingProgress />,
                         'CLASSES': () => <ClassSelector />,
                         'ERROR':   () => <ErrorReport />
                        }[this.state.step]()
                      }
                    </div>
                    { this.state.loading ? null :
                      <div>
                        <Typography variant="body1" gutterBottom className={classes.body1}>
                          Try this <Link component="a" style={{ cursor: 'pointer' }} onClick={() => this.onLoadSampleNetwork('ranks', 'small')}>
                            sample network (small)
                          </Link>
                        </Typography>
                        <Typography variant="body1" gutterBottom className={classes.body1}>
                          Try this <Link component="a" style={{ cursor: 'pointer' }} onClick={() => this.onLoadSampleNetwork('ranks', 'large')}>
                            sample network (large)
                          </Link>
                        </Typography>
                        <Typography variant="body1" gutterBottom className={classes.body1}>
                          Test <Link component="a" style={{ cursor: 'pointer' }} onClick={() => this.onLoadSampleNetwork('rnaseq', 'large')}>
                            sample network from RNA-seq
                          </Link>
                        </Typography>
                      </div>
                    }
                  </Container>
                </Grid>
              </Grid>
            </Grid>
            { /* === BOTTOM Panel ================================================================= */ }
            {/* <Grid item>
              <RecentNetworksGrid />
            </Grid> */}
          </Grid>
        </div>
      </div>
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
                  <Tooltip arrow placement="bottom" title="EnrichmentMap Home">
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
  },
  container: {
    overflow: 'auto',
  },
  h5: {
    flexGrow: 1,
  },
  body1: {
    marginTop: theme.spacing(6),
    textAlign: 'center',
    lineHeight: '200%',
  },
  dropzone: {
    padding: theme.spacing(1),
  },
  spinner: {
    paddingTop: theme.spacing(6),
    textAlign: 'center',
    verticalAligh: 'middle',
  },
});

Content.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(useStyles)(Content);