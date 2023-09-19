import React from 'react';
import PropTypes from 'prop-types';

import { makeStyles } from '@material-ui/core/styles';

import HSBar from "react-horizontal-stacked-bar-chart";


const useUpDownHBarStyles = makeStyles(() => ({
  parent: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    pointerEvents: 'none',
  },
  text: {
    position: "absolute",
    top: 'auto',
    fontSize: "0.75rem",
    color: "#999",
    mixBlendMode: 'difference',
    marginLeft: '0.125em',
    marginRight: '0.125em',
    lineHeight: '1.7em'
  },
}));

export const UpDownHBar = ({ value, minValue, maxValue, downColor, upColor, bgColor, height, text }) => {
  const classes = useUpDownHBarStyles();

  let textStyle;

  if (text != null) {
    if (minValue > 0 && maxValue > 0) { // all positive => bars start at left and go right
      textStyle = { left: 0 };
    } else if (minValue < 0 && maxValue < 0) { // all negative => bars start at right and go left
      textStyle =  { right: 0 };
    } else if (value < 0) { // neg. value should be shifted right by the size of the pos. max. bar size
      let offset = Math.abs(maxValue) / (Math.abs(minValue) + Math.abs(maxValue)) * 100;
      textStyle =  { right: `${offset}%` };
    } else { // pos. value should be shifted left by the size of the neg. max. bar size
      let offset = Math.abs(minValue) / (Math.abs(minValue) + Math.abs(maxValue)) * 100;
      textStyle = { left: `${offset}%` };
    }
  }

  let data;

  if (value != null) {
    data = [];
    
    if (value < 0) {
      // Down
      if (minValue < 0 && minValue !== value) {
        data.push({ value: -(minValue - value), color: bgColor });
      }
      data.push({ value: -value, color: downColor });
      if (maxValue > 0) {
        data.push({ value: maxValue, color: bgColor });
      }
    } else {
      // Up
      if (minValue < 0) {
        data.push({ value: -minValue, color: bgColor });
      }
      data.push({ value: value, color: upColor });
      if (maxValue > 0 && maxValue !== value) {
        data.push({ value: (maxValue - value), color: bgColor });
      }
    }
  }

  return (
    <div className={classes.parent}>
      <HSBar data={data} height={height} />
    {text && (
      <span className={classes.text} style={textStyle}>{ text }</span>
    )}
    </div>
  );
};

UpDownHBar.propTypes = {
  value: PropTypes.number.isRequired,
  minValue: PropTypes.number.isRequired,
  maxValue: PropTypes.number.isRequired,
  downColor: PropTypes.string.isRequired,
  upColor: PropTypes.string.isRequired,
  bgColor: PropTypes.string.isRequired,
  height: PropTypes.number.isRequired,
  text: PropTypes.string,
};