import React, { Component } from 'react';
import PropTypes from 'prop-types';

import RecentNetworksGrid from './recent-networks-grid';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Toolbar } from '@material-ui/core';
import { Grid, Container } from '@material-ui/core';
import { Tooltip, Typography, Link } from '@material-ui/core';
import { CircularProgress, IconButton } from '@material-ui/core';
import { DropzoneArea } from 'material-ui-dropzone';
import WarningIcon from '@material-ui/icons/Warning';
import { AppLogoIcon } from '../svg-icons';


const STEP = {
  WAITING:'WAITING',
  LOADING:'LOADING',
  ERROR:'ERROR'
};


export class Content extends Component {

  constructor(props) {
    super(props);

    this.state = {
      step: STEP.WAITING,
      errorMessage: null
    };
  }

  showNetwork(id, secret) {
    // location.href = `/document/${id}/${secret}`;
    location.href = `/document/${id}`;
  }

  async sendRankedGeneListToService(ranksTSV) {
    const res2 = await fetch('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'text/tab-separated-values' },
      body: ranksTSV
    });
    // TODO Check for error!!
    const netID = await res2.text();
    return netID;
  }

  async loadSampleNetwork() {
    if(this.state.loading)
      return;
    this.setState({ step: STEP.LOADING });

    // const sdRes = await fetch('/sample-data/brca_hd_tep_ranks_100.rnk');
    const sdRes = await fetch('/api/iamerror');
    if(sdRes.ok) {
      const ranks = await sdRes.text();
      const netID = await this.sendRankedGeneListToService(ranks);
      this.showNetwork(netID);
    } else {
      this.setState({ 
        step: STEP.ERROR, 
        errorMessage: "Error loading sample network"
      });
    }
  }

  async onDropzoneFileLoad(files) {
    if(this.state.loading)
      return;
    const file = files && files.length > 0 ? files[0] : null;
    if(file) {
      this.setState({ loading: true });
      const contents = await this.readTextFile(file);
      this.validateRanks(contents); // TODO
      const netID = await this.sendRankedGeneListToService(contents);
      this.showNetwork(netID);
    }
  }

  validateRanks(contents) {
    // TODO validate that the file contents are a properly formatted ranked gene list
  }


  readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = evt => resolve(evt.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  

  render() {
    const { classes } = this.props;

    const RanksDropArea = () =>
      <DropzoneArea
        //acceptedFiles={['text/plain']} // no idea how to get this to accept .rnk files
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

    const ErrorReport = ({message}) =>
      <div className={classes.spinner}>
        <WarningIcon fontSize='large'/>
        <Typography>{message}</Typography>
      </div>;

    return (
      <div className={classes.root} style={{ height: '100%' }}>
        { this.renderHeader() }
        <div className={classes.root} style={{ height: '100%', overflowY: 'scroll' }}>
          <Grid container direction="column" alignItems="stretch" alignContent="stretch" justifyContent="flex-start">
            { /* === TOP Panel ==================================================================== */ }
            <Grid item>
              <Grid container direction="row" alignItems="stretch" alignContent="stretch" justifyContent="center" spacing={3}>
                { /* === LEFT Panel ===================================================== */ }
                <Grid item className={classes.root}>
                  <Container direction="column" className={classes.container}>
                    <Typography variant="body1" gutterBottom className={classes.body1}>
                      Create EnrichmentMap networks with This Website. <br />
                      <br />
                    </Typography>
                    <div style={{ width: '550px', height: '300px'}}>
                      { {'WAITING': () => <RanksDropArea />,
                         'LOADING': () => <LoadingProgress />,
                         'ERROR':   () => <ErrorReport message={this.state.errorMessage} />
                        }[this.state.step]()
                      }
                    </div>
                    { this.state.loading ? null :
                      <Typography variant="body1" gutterBottom className={classes.body1}>
                        Try this <Link component="a" style={{ cursor: 'pointer' }} onClick={() => this.loadSampleNetwork()}>sample network</Link>.
                      </Typography>
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
                    <IconButton 
                      aria-label='close' 
                      onClick={() => location.href = '/'}
                    >
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
  spinner: {
    paddingTop: theme.spacing(6),
    textAlign: 'center',
    verticalAligh: 'middle',
  },
  root: {
    alignContent: 'center',
  },
  container: {
    margin: theme.spacing(1),
    padding: theme.spacing(2),
    overflow: 'auto',
  },
  paper: {
    padding: theme.spacing(2),
    whiteSpace: 'nowrap',
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  item: {
    margin: 0,
  },
  button: {
    margin: 0,
    textTransform: 'unset',
  },
  startIcon: {
    marginLeft: 0,
    marginRight: 0,
  },
  emptyButtonLabel: {
    flexDirection: 'column',
    paddingTop: 25,
  },
  h5: {
    flexGrow: 1,
  },
  subtitle1: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  body1: {
    marginTop: theme.spacing(6),
    textAlign: 'center',
    lineHeight: '200%',
  },
});

Content.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(useStyles)(Content);