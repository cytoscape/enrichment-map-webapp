import React from 'react';
import PropTypes from 'prop-types';
import chroma from 'chroma-js';
import { NES_COLOR_RANGE } from './network-style';


export function getSVGString(svgID) {
  var element = document.getElementById(svgID);
  var svg = element.cloneNode(true);

  // Don't export the NES marker on the node color legend
  const path = svg.getElementById(svgID + '-arrow-path');
  const text = svg.getElementById(svgID + '-arrow-text');
  path?.remove();
  text?.remove();

  const serializer = new XMLSerializer();
  let xmlString = serializer.serializeToString(svg);

  // remove height attribute
  xmlString = xmlString.replace(/^<svg height="\d+"/, '<svg ');
  // add namespaces
  if(!xmlString.match(/^<svg[^>]+"http:\/\/www\.w3\.org\/1999\/xlink"/)) {
    xmlString = xmlString.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'); 
  }
  
  // add xml tag
  xmlString = '<?xml version="1.0" standalone="no"?>\r\n' + xmlString;
  return xmlString;
}


function numToText(num) {
  return (Math.round((num || 1.0) * 100) / 100).toFixed(2);
}

function mapRange(num, in_min, in_max, out_min, out_max) {
  return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}


export function NodeColorLegend({ height, svgID, magNES, nesVal }) {
  const magNesText = numToText(magNES);

  const Marker = () => {
    if(nesVal) {
      const nesValText = numToText(nesVal);
      const nesValColor = chroma.scale(NES_COLOR_RANGE.range3).domain([-magNES, 0, magNES])(nesVal).toString(); // TODO get this from the style
      const lineYPos  = mapRange(nesVal, magNES, -magNES, 120, 286);
      const arrowYPos = mapRange(nesVal, magNES, -magNES, -9, 155);
      return <>
        <path 
          id={svgID + '-arrow-path'}
          d="M 25.404 130.007 H 25.404 L 25.404 121.978 L 50.697 130.356 L 25.404 138.734 L 25.404 130.705 H 25.404 V 130.007 Z" 
          style={{fill: nesValColor, stroke: 'rgb(0, 0, 0)'}} transform={`matrix(1, 0, 0, 1, 137, ${arrowYPos})`} /> 
        <text 
          id={svgID + '-arrow-text'}
          style={{whiteSpace: 'pre', fill: 'rgb(51, 51, 51)', fontFamily: 'Arial, sans-serif', fontSize: '15.2px'}} x="120" y={lineYPos+6}>
            {nesValText}
        </text>
      </>;
    }
    return null;
  };

  return (
    <div>
      <svg height={height} id={svgID} viewBox="114.727 105.034 188.228 195.513" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient-2-0" gradientUnits="userSpaceOnUse" x1="63.525" y1="36.468" x2="63.525" y2="201.138" gradientTransform="matrix(1, 0, 0, 1, 0, 0)" xlinkHref="#gradient-2"/>
          <linearGradient id="gradient-2">
            <stop offset="0"   style={{stopColor: NES_COLOR_RANGE.upMax}}/>
            <stop offset="0.5" style={{stopColor: NES_COLOR_RANGE.zero}}/>
            <stop offset="1"   style={{stopColor: NES_COLOR_RANGE.downMax}}/>
          </linearGradient>
        </defs>
        <rect x="39.862" y="36" width="47.326" height="165" transform="matrix(1, 0, 0, 1, 146.654709, 85.195206)" 
          style={{stroke: 'rgb(0, 0, 0)', fill: 'url(#gradient-2-0)'}}/>
        <text x="243.502" y="135.253" style={{whiteSpace: 'pre', fill: 'rgb(51, 51, 51)', fontFamily: 'Arial, sans-serif', fontSize: '15.2px'}}>{magNesText}</text>
        <text x="244.101" y="209.42"  style={{whiteSpace: 'pre', fill: 'rgb(51, 51, 51)', fontFamily: 'Arial, sans-serif', fontSize: '15.2px'}}>0.0</text>
        <text x="239.478" y="282.241" style={{whiteSpace: 'pre', fill: 'rgb(51, 51, 51)', fontFamily: 'Arial, sans-serif', fontSize: '15.2px'}}>-{magNesText}</text>
        <Marker />
      </svg>
    </div>
  );
  //transform="matrix(1, 0, 0, 1, 137, 74)"
}
NodeColorLegend.propTypes = {
  magNES: PropTypes.number.isRequired, 
  height: PropTypes.number,
  svgID: PropTypes.string,
  nesVal: PropTypes.number, 
};


export function EdgeWidthLegend({ height, svgID }) {
  return (
    <div>
      {/* height attribute must go first so it can be removed on export */}
      <svg height={height} id={svgID} viewBox="0 0 119.499 226.233" xmlns="http://www.w3.org/2000/svg">
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

