import debug from './debug';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from './router';
import { registerCytoscapeExtensions } from './cy-extensions';
import { fixOldFashionedScrollStyle } from './scroll';
import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";
import { SENTRY, SENTRY_ENVIRONMENT } from './env';

if( debug.enabled() ){
  debug.init();
}

if (SENTRY) {
  Sentry.init({
    dsn: "https://996aac9eb02a4419b5e7babe8163696e@o4504571938603008.ingest.sentry.io/4504572057812992",
    integrations: [new BrowserTracing()],
    environment: SENTRY_ENVIRONMENT,
  
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
  });
}

registerCytoscapeExtensions();

let div = document.createElement('div');
div.setAttribute('id', 'root');

document.body.appendChild( div );

ReactDOM.render(
  <Router/>,
  div
);

fixOldFashionedScrollStyle();
