import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@material-ui/core';


export function LinkOut({ href, underline='hover', download=false, children }) {
  return (
    <Link href={href} download={download} underline={underline} target="_blank" rel="noreferrer">{ children }</Link>
  );
}
LinkOut.propTypes = {
  href: PropTypes.string.isRequired,
  underline: PropTypes.string,
  download: PropTypes.bool,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
};

export default LinkOut;