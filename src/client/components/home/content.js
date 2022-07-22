import React, { Component } from 'react';

// import RecentNetworksGrid from './recent-networks-grid';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';

import { AppLogoIcon } from '../svg-icons';

export class Content extends Component {

  constructor(props) {
    super(props);

    this.state = {
      dialogName: null,
      wizardInfo: null,
    };
  }

  loadNetwork(id, secret) {
    // location.href = `/document/${id}/${secret}`;
    location.href = `/document/${id}`;
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
    const res = await fetch('/sample-data/brca_hd_tep_ranks_100.rnk');
    const ranks = await res.text();
    // Ask the server to import the json data
    const res2 = await fetch(`/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/tab-separated-values' },
      body: ranks
    });
    // Navigate to the new document
    const netID = await res2.text();
    this.loadNetwork(netID);
  }

  render() {
    return (
      <>
        <IonHeader>
          <IonToolbar color="dark">
            <IonButtons slot="start">
              <IonButton aria-label='home' defaultHref="/">
                <AppLogoIcon fontSize="large" />
              </IonButton>
            </IonButtons>
            <IonTitle>EnrichmentMap</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent color="light">
          <IonGrid>
            <IonRow>
              <IonCol class="ion-text-center" style={{lineHeight: '200%'}} size={12}>
                  <p className="ion-padding-vertical">
                    Create EnrichmentMap networks<br />for your papers<br />with This Website.
                  </p>
                  <p className="ion-padding-vertical">
                    Try this <a style={{ cursor: 'pointer' }} onClick={() => this.loadSampleNetwork()}>sample network</a>.
                  </p>
              </IonCol>
              {/* <IonCol size={6}>
                  <Grid item xs={12}>
                    <Container>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="subtitle1" gutterBottom className={classes.subtitle1}>
                            Start a New Network
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          { this.renderStart() }
                        </Grid>
                      </Grid>
                    </Container>
                  </Grid>
              </IonCol> */}
              </IonRow>
            {/* <IonRow>
              <RecentNetworksGrid />
            </IonRow> */}
          </IonGrid>
        </IonContent>
      </>
    );
  }

  // renderStart() {
  //   return (
  //     <Grid container direction="row" justifyContent="center" alignItems="stretch" spacing={4}>
  //       <Grid item>
  //         <Grid container direction="column" spacing={2}>
  //           <Grid item>
  //             <Typography variant="subtitle2">Create New:</Typography>
  //           </Grid>
  //           <Grid item>
  //             <Button
  //               aria-label='create empty network'
  //               variant="contained"
  //               color="default"
  //               size="large"
  //               // classes={{
  //               //   root: classes.button,
  //               //   startIcon: classes.startIcon,
  //               //   label: classes.emptyButtonLabel,
  //               // }}
  //               style={{ minWidth: 172, minHeight: 176 }}
  //               startIcon={<AddIcon style={{ fontSize: 44 }} />}
  //               onClick={() => this.creaaeNewNetwork()}
  //             >
  //               Empty
  //             </Button>
  //           </Grid>
  //         </Grid>
  //       </Grid>
  //       <Grid item>
  //         <Grid container direction="column" spacing={2}>
  //           <Grid item>
  //             <Typography variant="subtitle2">Import From:</Typography>
  //           </Grid>
  //           <Grid item>
  //             TODO
  //           </Grid>
  //         </Grid>
  //       </Grid>
  //     </Grid>
  //   );
  // }

}

// const useStyles = theme => ({
//   root: {
//     alignContent: 'center',
//   },
//   container: {
//     margin: theme.spacing(1),
//     padding: theme.spacing(2),
//     overflow: 'auto',
//   },
//   paper: {
//     padding: theme.spacing(2),
//     whiteSpace: 'nowrap',
//   },
//   divider: {
//     margin: theme.spacing(2, 0),
//   },
//   item: {
//     margin: 0,
//   },
//   button: {
//     margin: 0,
//     textTransform: 'unset',
//   },
//   startIcon: {
//     marginLeft: 0,
//     marginRight: 0,
//   },
//   emptyButtonLabel: {
//     flexDirection: 'column',
//     paddingTop: 25,
//   },
//   h5: {
//     flexGrow: 1,
//   },
//   subtitle1: {
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
//   body1: {
//     marginTop: theme.spacing(6),
//     textAlign: 'center',
//     lineHeight: '200%',
//   },
// });

export default Content;