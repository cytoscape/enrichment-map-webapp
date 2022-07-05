import React, { Component } from 'react';
import PropTypes from 'prop-types';

import RecentNetworksGrid from './recent-networks-grid';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Toolbar } from '@material-ui/core';
import { Grid, Container, Fade } from '@material-ui/core';
import { Tooltip, Typography, Link } from '@material-ui/core';
import { Button, IconButton } from '@material-ui/core';

import { AppLogoIcon } from '../svg-icons';
import AddIcon from '@material-ui/icons/Add';

export class Content extends Component {

  constructor(props) {
    super(props);

    this.state = {
      dialogName: null,
      wizardInfo: null,
    };
  }

  loadNetwork(id, secret) {
    location.href = `/document/${id}/${secret}`;
  }

  // createNewNetwork() {
  //   let create = async () => {
  //     let res = await fetch('/api/document', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify({
  //         data: {},
  //         elements: []
  //       })
  //     });

  //     let urls = await res.json();
  //     this.loadNetwork(urls.id, urls.secret);
  //   };

  //   create();
  // }

  // onCloseDialog() {
  //   this.setState({
  //     dialogName: null,
  //     wizardInfo: null,
  //   });
  // }

  // MKTODO enable this once mongo is working
  async loadSampleNetwork() {
    // Fetch the sample file
    // const res1 = await fetch('/sample-data/galFiltered-cx2.json');
    // const cx2 = await res1.json();
    // // Ask the server to import the json data
    // const res2 = await fetch(`/api/document/cx`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(cx2),
    // });
    // // Navigate to the new document
    // const urls = await res2.json();
    // this.loadNetwork(urls.id, urls.secret);
  }

  render() {
    const { classes } = this.props;

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
                      Create EnrichmentMap networks <br />for your papers<br />with This Website.
                    </Typography>
                    <Typography variant="body1" gutterBottom className={classes.body1}>
                      Try this <Link component="a" style={{ cursor: 'pointer' }} onClick={() => this.loadSampleNetwork()}>sample network</Link>.
                    </Typography>
                  </Container>
                </Grid>
                { /* === RIGHT Panel ==================================================== */ }
                {/* <Grid item className={classes.root}>
                  <Grid container direction="row" spacing={3}>
                    <Grid item xs={12}>
                      <Container className={classes.container}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} className={classes.root}>
                            <Typography variant="subtitle1" gutterBottom className={classes.subtitle1}>
                              Start a New Network
                            </Typography>
                          </Grid>
                          <Grid item xs={12} className={classes.root}>
                            { this.renderStart() }
                          </Grid>
                        </Grid>
                      </Container>
                    </Grid>
                  </Grid>
                </Grid> */}
              </Grid>
            </Grid>
            { /* === BOTTOM Panel ================================================================= */ }
            <Grid item>
              <RecentNetworksGrid />
            </Grid>
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
                  <Tooltip arrow placement="bottom" title="RNA-seq to EM Home">
                    <IconButton 
                      aria-label='close' 
                      onClick={() => location.href = '/'}
                    >
                      <AppLogoIcon fontSize="large" />
                    </IconButton>
                  </Tooltip>
                </Grid>
                <Grid item>
                  <Typography variant="h5" className={classes.h5}>RNA-seq to EM</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>
    );
  }

  renderStart() {
    const { classes } = this.props;

    return (
      <Grid container direction="row" justifyContent="center" alignItems="stretch" spacing={4}>
        <Grid item>
          <Grid container direction="column" className={classes.root} spacing={2}>
            <Grid item>
              <Typography variant="subtitle2">Create New:</Typography>
            </Grid>
            <Grid item>
              <Button
                aria-label='create empty network'
                variant="contained"
                color="default"
                size="large"
                classes={{
                  root: classes.button,
                  startIcon: classes.startIcon,
                  label: classes.emptyButtonLabel,
                }}
                style={{ minWidth: 172, minHeight: 176 }}
                startIcon={<AddIcon style={{ fontSize: 44 }} />}
                onClick={() => this.createNewNetwork()}
              >
                Empty
              </Button>
            </Grid>
          </Grid>
        </Grid>
        <Grid item>
          <Grid container direction="column" className={classes.root} spacing={2}>
            <Grid item>
              <Typography variant="subtitle2">Import From:</Typography>
            </Grid>
            <Grid item>
              TODO
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    );
  }

}


const useStyles = theme => ({
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