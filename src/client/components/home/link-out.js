import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@mui/material';


export function LinkOut({ href, underline='hover', children }) {
  return (
    <Link href={href} underline={underline} target="_blank" rel="noreferrer">{ children }</Link> 
  );
}
LinkOut.propTypes = {
  href: PropTypes.string.isRequired,
  underline: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
};

export default LinkOut;