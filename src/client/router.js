import React, { useEffect } from 'react';
import _ from 'lodash';
import { Route, Switch, useLocation } from 'react-router-dom';
import PageNotFound from './components/page-not-found';
import { RecentNetworksController } from './components/recent-networks-controller';
import { Home } from './components/home';
import { NetworkEditor } from './components/network-editor';
import { ReportHome } from './components/report';

const recentNetworksController = new RecentNetworksController();

export function Router() {
  const { pathname, hash, key } = useLocation();
  
  useEffect(() => {
    // If the URL has an anchor link (e.g. .../#about), we need to
    // scroll to the element here to make sure the element is rendered
    if (hash === '') {
      // If not a hash link, scroll to top
      window.scrollTo(0, 0);
    } else {
      // Scroll to id
      setTimeout(() => {
        const id = hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView();
        }
      }, 200);
    }
  }, [pathname, hash, key]);

  return  (
    <Switch>
      <Route
        path='/'
        exact
        render={(props) => (
          <Home {...props} recentNetworksController={recentNetworksController} />
        )}
      />
      <Route
        path='/report/:secret'
        render={(props) => {
          const secret = _.get(props, ['match', 'params', 'secret'], _.get(props, 'secret'));
          return <ReportHome secret={secret} />;
        }}
      />
      <Route
        path='/document/:id/:secret'
        render={(props) => (
          <NetworkEditor {...props} recentNetworksController={recentNetworksController} />
        )}
      />
      <Route
        path='/document/:id'
        render={(props) => {
          const params = parseQueryParams(props);
          const full = params['full'] === 'true';
          const id = _.get(props, ['match', 'params', 'id'], _.get(props, 'id'));
          const secret = _.get(props, ['match', 'params', 'secret'], _.get(props, 'secret'));
          return <NetworkEditor id={id} secret={secret} full={full} recentNetworksController={recentNetworksController} />;
        }}
      />
      <Route status={404} exact component={PageNotFound} />
    </Switch>
  );
}

function parseQueryParams(props) {
  const queryParamString = _.get(props, ['location', 'search'], '');
  const urlSearchParams = new URLSearchParams(queryParamString);
  const queryParams = Object.fromEntries(urlSearchParams.entries());
  return queryParams;
}

export default Router;