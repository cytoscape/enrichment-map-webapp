import React from 'react';
import PropTypes from 'prop-types';

import { withStyles } from '@material-ui/core/styles';

import { Typography } from '@material-ui/core';
import MuiAccordion from '@material-ui/core/Accordion';
import MuiAccordionSummary from '@material-ui/core/AccordionSummary';
import MuiAccordionDetails from '@material-ui/core/AccordionDetails';

import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

const HEADER_HEIGHT = 48;

const CollapsiblePanel = ({ title, defaultExpanded, children }) => {
  const Accordion = withStyles((theme) => ({
    root: {
      borderColor: theme.palette.divider,
      borderWidth: '1px',
      borderStyle: 'solid solid hidden hidden',
      boxShadow: 'none',
      '&:before': {
        display: 'none',
      },
      '&$expanded': {
        margin: 0,
        padding: 0,
      },
    },
    expanded: {},
  }))(MuiAccordion);

  const AccordionSummary = withStyles({
    root: {
      minHeight: HEADER_HEIGHT,
      '&$expanded': {
        minHeight: HEADER_HEIGHT,
      },
    },
    content: {
      '&$expanded': {
        margin: 0,
        padding: 0,
      },
    },
    expanded: {},
  })(MuiAccordionSummary);

  const AccordionDetails = withStyles({
    root: {
      width: '100%',
      padding: 0,
      margin: 0,
    },
  })(MuiAccordionDetails);

  return (
    <Accordion defaultExpanded={defaultExpanded}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {children}
      </AccordionDetails>
    </Accordion>
  );
};

CollapsiblePanel.propTypes = {
  title: PropTypes.string.isRequired,
  defaultExpanded: PropTypes.bool,
  children: PropTypes.element.isRequired,
};

export default CollapsiblePanel;