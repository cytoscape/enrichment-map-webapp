import React from 'react';
import { Route } from 'react-router-dom';

import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

import PageNotFound from './components/page-not-found';
import { Home } from './components/home';
import { NetworkEditor } from './components/network-editor';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

export const Router = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet id="main">
        <Route
          path="/"
          exact
          render={(props) => (
            <Home {...props} />
          )}
        >
        </Route>
        <Route
          path='/document/:id'
          render={(props) => (
            <NetworkEditor {...props} />
          )}
        />
        {/* <Route
          path='/document/:id/:secret'
          render={(props) => (
            <NetworkEditor {...props} />
          )}
        /> */}
        <Route status={404} exact component={PageNotFound} />
      </IonRouterOutlet>
    </IonReactRouter>
  


    {/* <BrowserRouter>
      <Switch>
        <Route
          path='/'
          exact
          render={(props) => (
            <Home {...props} />
          )}
        />
        <Route
          path='/document/:id/:secret'
          render={(props) => (
            <NetworkEditor {...props} />
          )}
        />
        <Route
          path='/document/:id'
          render={(props) => (
            <NetworkEditor {...props} />
          )}
        />
        <Route status={404} exact component={PageNotFound} />
      </Switch>
    </BrowserRouter> */}
  </IonApp>
);

export default Router;