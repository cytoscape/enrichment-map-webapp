import React from 'react';
import _ from 'lodash';
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
        render={(props) => {
          const params = parseQueryParams(props);
          const full = params['full'] === 'true';
          const id = _.get(props, ['match', 'params', 'id'], _.get(props, 'id'));
          const secret = _.get(props, ['match', 'params', 'secret'], _.get(props, 'secret'));
          return <NetworkEditor id={id} secret={secret} full={full} />;
        }}
      />
      <Route status={404} exact component={PageNotFound} />
    </Switch>
  </BrowserRouter>
);

function parseQueryParams(props) {
  const queryParamString = _.get(props, ['location', 'search'], '');
  const urlSearchParams = new URLSearchParams(queryParamString);
  const queryParams = Object.fromEntries(urlSearchParams.entries());
  return queryParams;
}

export default Router;