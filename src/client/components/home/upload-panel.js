import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { linkoutProps } from '../defaults';
import theme from '../../theme';

import { makeStyles } from '@material-ui/core/styles';

import { Grid, Paper, Typography, Link } from '@material-ui/core';
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
  tableRow: {
    borderColor: theme.palette.text.secondary,
  },
  tableCell: {
    fontSize: '0.85em',
    fontFamily: 'Monaco,Courier New,Monospace',
    color: theme.palette.text.secondary,
    borderColor: theme.palette.divider,
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
}));

const createRankedRow = (gene, rank) => {
  return { gene, rank };
};

const createRnaSeqRow = (gene, exp1, exp2) => {
  return { gene, exp1, exp2 };
};

const RANKED_ROWS = [
  createRankedRow('ANKRD9',  50.62464011),
  createRankedRow('LYL1',    41.57521227),
  createRankedRow('ABHD17A', 21.96322182),
  createRankedRow('EVA1B',   20.35075839),
  createRankedRow('FOXO3',   11.93840251),
];

const RNASEQ_ROWS = [
  createRnaSeqRow('MUC1',   950, 550),
  createRnaSeqRow('MUC6',   890, 640),
  createRnaSeqRow('GCNT1',  670, 860),
  createRnaSeqRow('B3GNT9', 700, 910),
  createRnaSeqRow('GALNT9', 730, 800),
];

const SampleTable = ({ data }) => {
  const classes = useStyles();

  const keys = Object.keys(data[0]);

  return (
    <Paper className={classes.tableContainer} variant="outlined">
      <Table size="small">
        <TableHead className={classes.tableHead} >
          <TableRow className={classes.tableRow}>
          {keys.map((k, idx) => (
            <TableCell key={k} align={idx === 0 ? 'left' : 'center'} className={classes.tableCell}><i>{k}</i></TableCell>
          ))}
          </TableRow>
        </TableHead>
        <TableBody>
        {data.map((row) => (
          <TableRow key={row.gene}>
          {keys.map((k, idx) => (
            <TableCell key={k + '_' + idx} align={idx === 0 ? 'left' : 'center'} className={classes.tableCell}>{row[k]}</TableCell>
          ))}
          </TableRow>
        ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

const FormatAccordion = ({ isMobile, id, title, summary, data, children, expanded, onChange }) => {
  const classes = useStyles();

  return (
    <Accordion defaultExpanded={id === 'format1'} expanded={expanded} variant="outlined" onChange={onChange(id)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography className={classes.accordionHead}>{ title }</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container direction="column" alignItems="flex-start">
          <Grid item>
            <Typography variant="body2" color="secondary" className={classes.accordionSummary}>{ summary }</Typography>
          </Grid>
          <Grid item>
            <Grid
              container
              direction={isMobile ? 'column' : 'row'}
              alignItems={isMobile ? 'center' : 'flex-start'}
              justifyContent="space-between"
              spacing={isMobile ? 2 : 0}
            >
              <Grid item sm={6}>
                <SampleTable data={data} />
              </Grid>
              <Grid item sm={6}>
                <Typography component="div" variant="body2" color="secondary">
                  { children }
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

const UploadPanel = ({ isMobile }) => {
  const classes = useStyles();
  const [expanded, setExpanded] = useState('f1');

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const GeneNameInfo = () =>
    <>
      The first column is the gene <code>name</code>&nbsp;
      &#40;<Link href="http://www.ensembl.org/Homo_sapiens/Info/Index" className={classes.linkout} {...linkoutProps}>Ensembl</Link> or&nbsp;
      <Link href="https://www.genenames.org/" className={classes.linkout} {...linkoutProps}>HGNC</Link> IDs, for Human species only&#41;.
    </>;

  const summary = 
    <>
       It must have a header row, followed by the data rows.<br />
       The column names are not important, but their orders are.
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
        data={RNASEQ_ROWS}
        expanded={expanded === "f1"}
        onChange={handleChange}
      >
        It must have 3 or more columns:
        <ul>
          <li><GeneNameInfo /></li>
          <li>The other columns must be numeric.</li>
          <li>If there are additional columns, you will have to set them as &ldquo;ignored&rdquo; in the next step.</li>
        </ul>
      </FormatAccordion>
      <FormatAccordion
        id="f2"
        title="Pre-Ranked Gene List"
        summary={summary}
        isMobile={isMobile}
        data={RANKED_ROWS}
        expanded={expanded === "f2"}
        onChange={handleChange}
      >
        It must have exactly 2 columns:
        <ul>
          <li><GeneNameInfo /></li>
          <li>The second column is the numeric <code>rank</code>.</li>
        </ul>
      </FormatAccordion>
    </>
  );
};

SampleTable.propTypes = {
  data: PropTypes.array.isRequired,
};

FormatAccordion.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  summary: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  isMobile: PropTypes.bool.isRequired,
  data: PropTypes.array.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  expanded: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

UploadPanel.propTypes = {
  isMobile: PropTypes.bool,
};

export default UploadPanel;