import React from 'react';
import PropTypes from 'prop-types';

import theme from '../../theme';

import { makeStyles } from '@material-ui/core/styles';
import { Typography, Tooltip } from '@material-ui/core';
import HSBar from "react-horizontal-stacked-bar-chart";

import StarIcon from '@material-ui/icons/Star';
import StarOutlineIcon from '@material-ui/icons/StarOutline';


function numToText(num) {
  return (Math.round((num || 1.0) * 100) / 100).toFixed(2);
}

// ==[ Up-Down Horizontal Bar ]==============================================================================================================

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
    color: "#666",
    mixBlendMode: 'difference',
    marginLeft: '0.125em',
    marginRight: '0.125em',
    lineHeight: '1.7em'
  },
}));

export const UpDownHBar = ({ value, minValue, maxValue, color, bgColor, height, text }) => {
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
      data.push({ value: -value, color: color });
      if (maxValue > 0) {
        data.push({ value: maxValue, color: bgColor });
      }
    } else {
      // Up
      if (minValue < 0) {
        data.push({ value: -minValue, color: bgColor });
      }
      data.push({ value: value, color: color });
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
  color: PropTypes.string.isRequired,
  bgColor: PropTypes.string.isRequired,
  height: PropTypes.number.isRequired,
  text: PropTypes.string,
};

// ==[ Up-Down Gradient LEGEND ]=============================================================================================================

export const UpDownLegend = ({ value, minValue, maxValue, downColor, zeroColor, upColor, height, tooltip, style }) => {
  let left = 0;
  if (value) {
    left = (value - minValue) / (maxValue - minValue);
    left *= 100;
  }

  return (
    <div style={style}>
      <div 
        style={{
          position: 'relative',
          width: '100%',
          height: height,
          background: `linear-gradient(to right, ${downColor} 0%, ${zeroColor} 50%, ${upColor} 100%)`,
          border: `2px solid ${theme.palette.divider}`,
        }}
      >
      {value && (
        <>
          <Tooltip title={tooltip ? tooltip : ''}>
            <Typography
              color="textPrimary"
              style={{
                position: 'absolute',
                left: `${left}%`,
                transform: 'translate(-50%, -100%)',
                fontSize: '0.85em',
              }}
            >
              { numToText(value) }
            </Typography>
          </Tooltip>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${left}%`,
              width: 3,
              height: height,
              marginTop: -height / 2,
              backgroundColor: theme.palette.text.primary,
              border: `1px solid ${theme.palette.background.default}`,
            }}
          />
        </>
      )}
      </div>
    </div>
  );
};
UpDownLegend.propTypes = {
  value: PropTypes.number,
  minValue: PropTypes.number.isRequired,
  maxValue: PropTypes.number.isRequired,
  downColor: PropTypes.string.isRequired,
  zeroColor: PropTypes.string.isRequired,
  upColor: PropTypes.string.isRequired,
  height: PropTypes.number.isRequired,
  tooltip: PropTypes.string,
  style: PropTypes.object,
};

// ==[ P-Value Star Rating ]=================================================================================================================

const usePValueStarRatingStyles = makeStyles(() => ({
  parent: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  icon: {
    fontSize: '1.25em',
  },
}));

export const PValueStarRating = ({ value }) => {
  const classes = usePValueStarRatingStyles();

  // Many people add asterisks to tables and graphs to show how low the P value is.
  // The standards for one to three asterisks are quite standard (<0.05, <0.01, <0.001), and both the NEJM and APA agree.
  // Prism (since 5.04/d) will also show four asterisks when the P value is less than 0.0001, which is what we use here.
  // (https://www.graphpad.com/support/faq/how-to-report-p-values-in-journals/)
  const standards = [ 0.05, 0.01, 0.001, 0.0001 ];
  const max = standards.length;
  let rating = 0;
  
  for (let i = max; i > 0; i--) {
    const limit = standards[i - 1];
    if (value < limit) {
      rating = i;
      break;
    }
  }

  return (
    <div className={classes.parent}>
    {[...Array(rating)].map((v, i) => (
      <StarIcon key={i} className={classes.icon} />
    ))}
    {[...Array(max - rating)].map((v, i) => (
      <StarOutlineIcon key={i + rating} color="disabled" className={classes.icon} />
    ))}
    </div>
  );
};
PValueStarRating.propTypes = {
  value: PropTypes.number.isRequired,
};
