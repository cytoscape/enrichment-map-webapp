import debug from './debug';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from './router';
import { Chart } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { registerCytoscapeExtensions } from '../model/cy-extensions';
import { fixOldFashionedScrollStyle } from './scroll';
import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";
import { SENTRY, SENTRY_ENVIRONMENT } from './env';

// See https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-JavaScript
function xoshiro128ss(a, b, c, d) {
  return function() {
      var t = b << 9, r = a * 5; r = (r << 7 | r >>> 25) * 9;
      c ^= a; d ^= b;
      b ^= c; a ^= d; c ^= t;
      d = d << 11 | d >>> 21;
      return (r >>> 0) / 4294967296;
  };
}

const rng = xoshiro128ss(3728386577354669, 4177051891409301, 6293788895719469, 105826358935507);

// monkey patch Math.random() so layouts are deterministic
Math.random = () => rng();

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

Chart.register(annotationPlugin);

registerCytoscapeExtensions();

let div = document.createElement('div');
div.setAttribute('id', 'root');

document.body.appendChild( div );

ReactDOM.render(
  <Router/>,
  div
);

fixOldFashionedScrollStyle();
