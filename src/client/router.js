import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import PageNotFound from './components/page-not-found';
import { Home } from './components/home';
import { NetworkEditor } from './components/network-editor';

export const Router = () => (
  <BrowserRouter>
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

      {/* TEMPORARY, to test summary network */}
      <Route
        path='/summary/:id'
        render={(props) => (
          <NetworkEditor {...props} summary />
        )}
      />

      <Route status={404} exact component={PageNotFound} />
    </Switch>
  </BrowserRouter>
);

export default Router;