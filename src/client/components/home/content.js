import React, { Component } from 'react';
import PropTypes from 'prop-types';

import RecentNetworksGrid from './recent-networks-grid';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Button, Toolbar } from '@material-ui/core';
import { Grid, Container } from '@material-ui/core';
import { Tooltip, Typography, Link } from '@material-ui/core';
import { CircularProgress, IconButton } from '@material-ui/core';
import { DropzoneArea } from 'material-ui-dropzone';
import WarningIcon from '@material-ui/icons/Warning';
import { AppLogoIcon } from '../svg-icons';
import CSVFileValidator from 'csv-file-validator';


const STEP = {
  WAITING:'WAITING',
  LOADING:'LOADING',
  ERROR:'ERROR'
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

  async sendRankedGeneListToEMService(ranksTSV, networkName) {
    const res = await fetch('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'text/tab-separated-values' },
      body: ranksTSV
    });

    if(res.ok) {
      // Update the network name
      const netID = await res.text();
      
      await fetch(`/api/${netID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ networkName: networkName })
      });

      return { netID };
    } else {
      return { errors: ["Error running EnrichmentMap service."]};
    }
  }


  async onLoadSampleNetwork(size) {
    if(this.state.step == STEP.LOADING)
      return;

    this.setState({ step: STEP.LOADING });

    const name = size == 'small'  ? 'brca_hd_tep_ranks_100' : 'brca_hd_tep_ranks';
    const url = `/sample-data/${name}.rnk`;

    const sdRes = await fetch(url);
    if(!sdRes.ok) {
      this.setState({ step: STEP.ERROR, errorMessages: ["Error loading sample network"] });
      return;
    }

    const ranks = await sdRes.text();
    const emRes = await this.sendRankedGeneListToEMService(ranks, name);
    if(emRes.errors) {
      this.setState({ step: STEP.ERROR, errorMessages: emRes.errors });
      return;
    }

    this.showNetwork(emRes.netID);
  }


  async onDropzoneFileLoad(files) {
    if(this.state.step == STEP.LOADING)
      return;
    const file = files && files.length > 0 ? files[0] : null;
    if(!file)
      return;
   
    this.setState({ step: STEP.LOADING });

    const contents = await this.readTextFile(file);
    const errors   = await this.validateRanks(contents);
    if(errors) {
      this.setState({ step: STEP.ERROR, errorMessages: errors });
      return;
    } 

    const emRes = await this.sendRankedGeneListToEMService(contents, file.name.replace(FILE_EXT_REGEX, ''));
    if(emRes.errors) {
      this.setState({ step: STEP.ERROR, errorMessages: emRes.errors });
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


  async validateRanks(contents) {
    const headerError = (val, name) => {
      if(name == 'gene')
        return 'The header name for the first column should be "gene".';
      else if(name == 'rank')
        return 'The header name for the second column should be "rank".';
    };

    const config = {
      delimiter: '\t',
      headers: [
        { name: 'gene', inputName: 'gene', required: true, headerError }, 
        { name: 'rank', inputName: 'rank', required: true, headerError }
      ]
    };

    const csvData = await CSVFileValidator(contents, config);
    const errors = csvData.inValidData.map(({message}) => message);
    if(errors && errors.length > 0)
      return errors; // otherwise fall off end and return undefined
  }


  render() {
    const { classes } = this.props;

    const RanksDropArea = () =>
      <DropzoneArea
        //acceptedFiles={['text/plain']} // no idea how to get this to accept .rnk files
        classes={{root: classes.dropzone}}
        filesLimit={1}
        onChange={files => this.onDropzoneFileLoad(files)}
        dropzoneText='Drag and drop a ranked-gene-list file, or click.'
        showPreviews={false}
        showPreviewsInDropzone={false}
      />;

    const LoadingProgress = () => 
      <div className={classes.spinner}>
        <CircularProgress />
        <Typography>Running Enrichment Analysis and Building Network.</Typography>
      </div>;

    const ErrorReport = ({ errorMessages }) =>
      <div className={classes.spinner}>
        <WarningIcon fontSize='large'/>
        { errorMessages.slice(0,7).map((message, index) =>
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
                      { {'WAITING': () => <RanksDropArea />,
                         'LOADING': () => <LoadingProgress />,
                         'ERROR':   () => <ErrorReport errorMessages={this.state.errorMessages} />
                        }[this.state.step]()
                      }
                    </div>
                    { this.state.loading ? null :
                      <div>
                        <Typography variant="body1" gutterBottom className={classes.body1}>
                          Try this <Link component="a" style={{ cursor: 'pointer' }} onClick={() => this.onLoadSampleNetwork('small')}>
                            sample network (small)
                          </Link>
                        </Typography>
                        <Typography variant="body1" gutterBottom className={classes.body1}>
                          Try this <Link component="a" style={{ cursor: 'pointer' }} onClick={() => this.onLoadSampleNetwork('large')}>
                            sample network (large)
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