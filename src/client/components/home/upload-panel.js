import React, { useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { linkoutProps } from '../defaults';
import theme from '../../theme';

import { makeStyles } from '@material-ui/core/styles';

import { Grid, Paper, Typography, Link, Tooltip } from '@material-ui/core';
import { Accordion, AccordionDetails, AccordionSummary } from '@material-ui/core';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@material-ui/core';

import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

const useStyles = makeStyles((theme) => ({
  tableContainer: {
    maxWidth: 240,
    background: theme.palette.background.default,
  },
  tableHead: {
    textTransform: 'capitalize',
  },
  tableCell: {
    fontSize: '0.85em',
    fontFamily: 'Monaco,Courier New,Monospace',
    color: theme.palette.text.disabled,
  },
  accordionHead: {
    fontSize: theme.typography.pxToRem(15),
    fontWeight: theme.typography.fontWeightRegular,
  },
  accordionSummary: {
    marginBottom: theme.spacing(2),
  },
  linkout: {
    color: theme.palette.text.primary,
  },
  spotlightLink: {
    color: theme.palette.text.secondary,
    borderBottom: `1px dotted ${theme.palette.text.disabled}`,
    cursor: 'default',
    "&:hover": {
      color: theme.palette.text.primary,
      borderBottom: `1px dotted ${theme.palette.text.secondary}`,
    }
  },
  spotlight: {
    backgroundColor: theme.palette.action.selected,
  },
}));

const createRankedRow = (gene, rank) => {
  return { gene, rank };
};

const createRnaSeqRow = (gene, exp1, exp2) => {
  return { gene, exp1, exp2 };
};

const RANKED_HEADER = [
  {
    id: 'gene',
    tooltip: 'The gene ID (Ensembl or HGNC)',
  },
  {
    id: 'rank',
    tooltip: 'The gene rank value',
  },
];
const RANKED_ROWS = [
  createRankedRow('ANKRD9',  50.62464011),
  createRankedRow('LYL1',    41.57521227),
  createRankedRow('ABHD17A', 21.96322182),
  createRankedRow('EVA1B',   20.35075839),
  createRankedRow('FOXO3',   11.93840251),
];

const RNASEQ_HEADER = [
  {
    id: 'gene',
    tooltip: 'The gene ID (Ensembl or HGNC)',
  },
  {
    id: 'exp1',
    tooltip: 'The EXPERIMENT expression value',
  },
  {
    id: 'exp2',
    tooltip: 'The CONTROL expression value',
  }
];
const RNASEQ_ROWS = [
  createRnaSeqRow('MUC1',   950, 550),
  createRnaSeqRow('MUC6',   890, 640),
  createRnaSeqRow('GCNT1',  670, 860),
  createRnaSeqRow('B3GNT9', 700, 910),
  createRnaSeqRow('GALNT9', 730, 800),
];

const SampleTable = ({ tableHead, tableRows, spotlight }) => {
  const classes = useStyles();
  const keys = Object.keys(tableRows[0]);
  const spotlightTokens = spotlight ? spotlight.split(',') : [];

  return (
    <Paper className={classes.tableContainer} variant="outlined">
      <Table size="small">
        <TableHead className={clsx(classes.tableHead, { [classes.spotlight]: (spotlightTokens.includes('header')) })}>
          <TableRow>
          {tableHead.map(({ id, tooltip }, idx) => (
            <TableCell
              key={id}
              align={idx === 0 ? 'left' : 'center'}
              className={clsx(classes.tableCell, { [classes.spotlight]: (spotlightTokens.includes(id)) })}
            >
              <Tooltip title={tooltip}>
                <i>{id}</i>
              </Tooltip>
            </TableCell>
          ))}
          </TableRow>
        </TableHead>
        <TableBody className={clsx({ [classes.spotlight]: (spotlightTokens.includes('data')) })}>
        {tableRows.map((row) => (
          <TableRow key={row.gene}>
          {keys.map((k, idx) => (
            <TableCell
              key={k + '_' + idx}
              align={idx === 0 ? 'left' : 'center'}
              className={clsx(classes.tableCell, { [classes.spotlight]: (spotlightTokens.includes(k)) })}>
                {row[k]}
              </TableCell>
          ))}
          </TableRow>
        ))}
        </TableBody>
      </Table>
    </Paper>
  );
};
SampleTable.propTypes = {
  tableHead: PropTypes.array.isRequired,
  tableRows: PropTypes.array.isRequired,
  spotlight: PropTypes.string,
};


const FormatAccordion = ({ isMobile, id, title, summary, tableHead, tableRows, children, spotlight, expanded, onChange }) => {
  const classes = useStyles();

  return (
    <Accordion defaultExpanded={id === 'format1'} expanded={expanded} variant="outlined" onChange={onChange(id)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography className={classes.accordionHead}>{ title }</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container direction="column" alignItems="flex-start">
          <Grid item>
            <Grid
              container
              direction={isMobile ? 'column' : 'row'}
              alignItems={isMobile ? 'center' : 'flex-start'}
              justifyContent="space-between"
              spacing={isMobile ? 2 : 0}
            >
              <Grid item sm={6}>
                <SampleTable tableHead={tableHead} tableRows={tableRows} spotlight={spotlight} />
              </Grid>
              <Grid item sm={6}>
                <Typography component="div" variant="body2" color="secondary">
                  { children }
                  { summary() }
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};
FormatAccordion.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  summary: PropTypes.func.isRequired,
  isMobile: PropTypes.bool.isRequired,
  tableHead: PropTypes.array.isRequired,
  tableRows: PropTypes.array.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  spotlight: PropTypes.string,
  expanded: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const Spotlight = ({ children, target, onMouseOver, onMouseOut }) => {
  const classes = useStyles();

  return (
    <span
      className={classes.spotlightLink}
      onMouseOver={() => onMouseOver(target)}
      onMouseOut={onMouseOut}
    >
      { children }
    </span>
  );
};
Spotlight.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  target: PropTypes.string.isRequired,
  onMouseOver: PropTypes.func.isRequired,
  onMouseOut: PropTypes.func.isRequired,
};

const UploadPanel = ({ isMobile }) => {
  const [ expanded, setExpanded ] = useState('f1');
  const [ spotlight, setSpotlight ] = useState();
  
  const classes = useStyles();

  const handleChange = (panel) => (event, expand) => {
    if (expand) // clicking an expanded accordion should not collapse it
      setExpanded(panel);
  };
  const handleMouseOver = (text) => {
    setSpotlight(text);
  };
  const handleMouseOut = () => {
    setSpotlight(null);
  };

  const GeneNameInfo = () =>
    <>
      <Spotlight target="gene" onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}>Gene column</Spotlight>: gene <code>names</code>&nbsp;
      &#40;<Link href="http://www.ensembl.org/Homo_sapiens/Info/Index" className={classes.linkout} {...linkoutProps}>Ensembl</Link> or&nbsp;
      <Link href="https://www.genenames.org/" className={classes.linkout} {...linkoutProps}>HGNC</Link> IDs&#41;.
    </>;

  const summary = () =>
    <>
       Your spreadsheet must have a&nbsp;
       <Spotlight target="header" onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}>header</Spotlight> row and&nbsp;
       <Spotlight target="data" onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}>data</Spotlight> rows in that order, with whatever row titles you prefer.
    </>;

  return (
    <>
      <Typography component="p" variant="body1" style={{marginBottom: theme.spacing(2.5)}}>
        Upload your file (<code>CSV</code>, <code>TSV</code> or <code>Excel</code>) in one of the formats below:
      </Typography>
      <FormatAccordion
        id="f1"
        title="RNA-Seq Expression Data"
        summary={summary}
        isMobile={isMobile}
        tableHead={RNASEQ_HEADER}
        tableRows={RNASEQ_ROWS}
        spotlight={spotlight}
        expanded={expanded === "f1"}
        onChange={handleChange}
      >
       <p style={{ marginTop: 0 }}>Your spreadsheet must have 3 or more columns, as follows:</p>
        <ol>
          <li><GeneNameInfo /></li>
          <li><Spotlight target="exp1,exp2" onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}><code>Expression</code> columns</Spotlight>: numeric expression values.</li>
          <li>Other columns: must be marked as &ldquo;ignored&rdquo; in the next step.</li>
        </ol>
      </FormatAccordion>
      <FormatAccordion
        id="f2"
        title="Pre-Ranked Gene List"
        summary={summary}
        isMobile={isMobile}
        tableHead={RANKED_HEADER}
        tableRows={RANKED_ROWS}
        spotlight={spotlight}
        expanded={expanded === "f2"}
        onChange={handleChange}
      >
        <p style={{ marginTop: 0 }}>Your spreadsheet must have exactly 2 columns, as follows:</p>
        <ol>
          <li><GeneNameInfo /></li>
          <li><Spotlight target="rank" onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}>Second column</Spotlight>: the numeric <code>ranks</code>.</li>
        </ol>
      </FormatAccordion>
    </>
  );
};
UploadPanel.propTypes = {
  isMobile: PropTypes.bool,
};

export default UploadPanel;