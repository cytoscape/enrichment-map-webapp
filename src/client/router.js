import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import PageNotFound from './components/page-not-found';

export const Router = () => (
  <BrowserRouter>
    <Switch>
      {/* <Route path='/' exact component={Home} /> */}
      <Route
        path='/'
        exact
        render={(props) => (
          <h1>Enrichment Map router component (router.js) TODO</h1>
        )}
      />
      <Route status={404} exact component={PageNotFound} />
    </Switch>
  </BrowserRouter>
);

export default Router;