import debug from './client/debug.js';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from './client/router.js';
import { Chart } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { registerCytoscapeExtensions } from './model/cy-extensions';
import { fixOldFashionedScrollStyle } from './client/scroll';

if( debug.enabled() ){
  debug.init();
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
