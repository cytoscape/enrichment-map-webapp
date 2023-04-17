import React from 'react';
import PropTypes from 'prop-types';
import { NES_COLOR_RANGE } from './network-style';
import chroma from 'chroma-js';


export function getSVGString(svgID) {
  var element = document.getElementById(svgID);
  var svg = element.cloneNode(true);

  // Don't export the NES marker on the node color legend
  svg.getElementById(svgID+'-marker')?.remove();

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

function mapRange(num, inMin, inMax, outMin, outMax) {
  return (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

function getNESColor(nesVal, magNES) {
  return chroma.scale(NES_COLOR_RANGE.range3).domain([-magNES, 0, magNES])(nesVal).toString();
}


export function NodeColorLegend({ height, svgID, magNES, nesVal }) {
  const textStyle = {whiteSpace: 'pre', fill: '#464448', fontFamily: '"Open Sans", "Helvetica Neue", Helvetica, sans-serif', fontSize: '15.2px'};

  const selectedTextStyle = {whiteSpace: 'pre', fill: 'rgb(255, 255, 255)', fontFamily: '"Open Sans", "Helvetica Neue", Helvetica, sans-serif', fontSize: '15.2px', stroke: 'rgba(0, 0, 0, 0.8)', strokeWidth: '3px', paintOrder: 'stroke'};

  // eslint-disable-next-line react/prop-types
  const Marker = ({ yTop, yBottom }) => {
    if(nesVal === undefined) 
      return null;

    const yPos = mapRange(nesVal, magNES, -magNES, yTop-10, yBottom-10);
    const textXPos = 35 - ((nesVal < 0) ? 2 : 0); // adjust to make room for minus sign
    const nesValColor = getNESColor(nesVal, magNES);
      
    return (
      <svg x="0" y={yPos} id={svgID+'-marker'}>
        <line x1="10" y1="10" x2="90" y2="10" stroke="black" />
        <polygon points="20,10 10,15 10,5" style={{ fill: nesValColor, stroke: 'black', strokeWidth: 1 }} />
        <polygon points="80,10 90,15 90,5" style={{ fill: nesValColor, stroke: 'black', strokeWidth: 1 }} />
        <text x={textXPos} y="15" style={selectedTextStyle}>{ numToText(nesVal) }</text>
      </svg>
    );
  };

  return (
    <div>
      {/* height attribute must go first because it is removed during export */}
      <svg height={height} id={svgID} viewBox="0 0 100 260" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="nes-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   style={{stopColor: NES_COLOR_RANGE.upMax}} />
            <stop offset="50%"  style={{stopColor: NES_COLOR_RANGE.zero}} />
            <stop offset="100%" style={{stopColor: NES_COLOR_RANGE.downMax}} />
          </linearGradient>
        </defs>
        <rect x="20" y="40" width="60" height="180" style={{stroke: 'black', fill: 'url(#nes-gradient)'}}/>
        <Marker yTop={40} yBottom={180+40} />
        <text x="30" y="22"  style={textStyle}> {numToText(magNES)}</text>
        <text x="32" y="248" style={textStyle}>-{numToText(magNES)}</text>
      </svg>
    </div>
  );
}

NodeColorLegend.propTypes = {
  magNES: PropTypes.number.isRequired, 
  height: PropTypes.number,
  svgID: PropTypes.string,
  nesVal: PropTypes.number, 
};
