import React from 'react';
import PropTypes from 'prop-types';

import withStyles from '@mui/styles/withStyles';

import { Typography } from '@mui/material';
import MuiAccordion from '@mui/material/Accordion';
import MuiAccordionSummary from '@mui/material/AccordionSummary';
import MuiAccordionDetails from '@mui/material/AccordionDetails';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const HEADER_HEIGHT = 48;

const CollapsiblePanel = ({ title, defaultExpanded, onChange, children }) => {
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
    <Accordion defaultExpanded={defaultExpanded} onChange={onChange}>
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
  onChange: PropTypes.func,
  children: PropTypes.element.isRequired,
};

export default CollapsiblePanel;