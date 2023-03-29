import React from 'react';
import PropTypes from 'prop-types';
import { NES_COLOR_RANGE } from './network-style';


export function getSVGString(id) {
  var svg = document.getElementById(id);

  const serializer = new XMLSerializer();
  let xmlString = serializer.serializeToString(svg);

  // add namespaces
  if(!xmlString.match(/^<svg[^>]+"http:\/\/www\.w3\.org\/1999\/xlink"/)) {
    // JSX doesn't allow namespace tags, so we have to add it here
    xmlString = xmlString.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'); 
  }
  // add xml tag
  xmlString = '<?xml version="1.0" standalone="no"?>\r\n' + xmlString;

  return xmlString;
}


export function NodeColorLegend({ height, svgID, magNES }) {
  const nesText = (Math.round((magNES || 1.0) * 100) / 100).toFixed(2);
  return (
    <div>
      <svg id={svgID} height={height} viewBox="3.003 -2.42 142.521 229.382" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient-2-0" gradientUnits="userSpaceOnUse" x1="63.525" y1="36.468" x2="63.525" y2="201.138" gradientTransform="matrix(1, 0, 0, 1, 0, 0)" xlinkHref="#gradient-2"/>
          <linearGradient id="gradient-2">
            <stop offset="0"   style={{stopColor: NES_COLOR_RANGE.upMax}}/>
            <stop offset="0.5" style={{stopColor: NES_COLOR_RANGE.zero}}/>
            <stop offset="1"   style={{stopColor: NES_COLOR_RANGE.downMax}}/>
          </linearGradient>
        </defs>
        <rect x="39.862" y="36.468" width="47.326" height="164.67" style={{stroke: 'rgb(0, 0, 0)', fill: 'url(#gradient-2-0)'}} transform="matrix(1, 0, 0.007991, 1, -13.546245, 6.003267)"/>
        <text style={{whiteSpace: 'pre', fill: 'rgb(51, 51, 51)', fontFamily: 'Arial, sans-serif', fontSize: '15.2px'}} x="83.301" y="56.061">{nesText}</text>
        <text style={{whiteSpace: 'pre', fill: 'rgb(51, 51, 51)', fontFamily: 'Arial, sans-serif', fontSize: '15.2px'}} x="83.9"   y="130.228">0.0</text>
        <text style={{whiteSpace: 'pre', fill: 'rgb(51, 51, 51)', fontFamily: 'Arial, sans-serif', fontSize: '15.2px'}} x="79.277" y="203.049">-{nesText}</text>
        <text style={{whiteSpace: 'pre', fill: 'rgb(51, 51, 51)', fontFamily: 'Arial, sans-serif', fontSize: '15.2px'}} x="5" y="25.722">Enrichment (NES)</text>
      </svg>
    </div>
  );
}
NodeColorLegend.propTypes = {
  magNES: PropTypes.number.isRequired,
  height: PropTypes.number,
  svgID: PropTypes.string
};


export function EdgeWidthLegend({ height, svgID }) {
  return (
    <div>
      <svg id={svgID} height={height} viewBox="0 0 119.499 226.233" xmlns="http://www.w3.org/2000/svg">
        <text style={{whiteSpace: 'pre', fill: 'rgb(51, 51, 51)', fontFamily: 'Arial, sans-serif', fontSize: '16.2px'}} x="23.162" y="23.857">Similarity</text>
        <rect x="8.696" y="53.344" width="61.708" height="5.688"   style={{fill: 'rgb(216, 216, 216)', stroke: 'rgb(0, 0, 0)'}} transform="matrix(0.707107, -0.707107, 0.707107, 0.707107, -28.772488, 50.495087)"/>
        <rect x="8.696" y="83.033" width="61.708" height="8.853"   style={{fill: 'rgb(216, 216, 216)', stroke: 'rgb(0, 0, 0)'}} transform="matrix(0.707107, -0.707107, 0.707107, 0.707107, -53.56525, 87.485718)"/>
        <rect x="8.696" y="125.556" width="61.708" height="13.388" style={{fill: 'rgb(216, 216, 216)', stroke: 'rgb(0, 0, 0)'}} transform="matrix(0.707107, -0.707107, 0.707107, 0.707107, -84.726631, 116.429161)"/>
        <text style={{fill: 'rgb(51, 51, 51)', fontFamily: 'Arial, sans-serif', fontSize: '14px', whiteSpace: 'pre'}} x="72.542" y="191.869">More </text>
        <text style={{fill: 'rgb(51, 51, 51)', fontFamily: 'Arial, sans-serif', fontSize: '14px', whiteSpace: 'pre'}} x="72.866" y="62.897">Less</text>
      </svg>
    </div>
  );
}
EdgeWidthLegend.propTypes = {
  height: PropTypes.number,
  svgID: PropTypes.string
};

