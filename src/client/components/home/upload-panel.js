import React from 'react';
import PropTypes from 'prop-types';

import theme from '../../theme';

import { makeStyles } from '@material-ui/core/styles';

import { Grid, Paper, Typography } from '@material-ui/core';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@material-ui/core';

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
  subtitle: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(1),
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

  console.log(data[0]);
  const keys = Object.keys(data[0]);
  console.log(keys);

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

const FormatContainer = ({ isMobile, title, data, children }) => {
  const classes = useStyles();

  return (
    <>
      <Typography variant="subtitle1" className={classes.subtitle}>{ title }</Typography>
      <Grid container direction={isMobile ? 'row' : 'column'} alignItems="flex-start" justifyContent="space-between" spacing={isMobile ? 2 : 0}>
        <Grid item sm={12} md={6}>
          <SampleTable data={data} />
        </Grid>
        <Grid item sm={12} md={6}>
          <Typography component="div" variant="body2" color="secondary">
            { children }
          </Typography>
        </Grid>
      </Grid>
    </>
  );
};

const UploadPanel = ({ isMobile }) => {
  return (
    <>
      <Typography component="p" variant="body1">
        Upload your file (<code>CSV</code>, <code>TSV</code> or <code>Excel</code>) in one of the formats below:
      </Typography>
      <br />
      <Typography component="p" variant="body2" color="secondary">
        Both formats have a header row, followed by the data rows.<br />
        The column names are not important, but their orders are.
      </Typography>
      <FormatContainer isMobile={isMobile} data={RANKED_ROWS} title="Format 1 - Pre-Ranked Gene List">
        It must have exactly 2 columns:
        <ul>
          <li>The first column is the <code>gene</code> name.</li>
          <li>The second column is the numeric <code>rank</code>.</li>
        </ul>
      </FormatContainer>
      <FormatContainer isMobile={isMobile} data={RNASEQ_ROWS} title="Format 2 - RNA-Seq Expression Data">
        It must have 3 or more columns:
        <ul>
          <li>The first column is the gene <code>name</code>.</li>
          <li>The other columns must be numeric.</li>
          <li>If there are additional columns, such as <code>description</code>, you will have to set them as "ignored" in the next step.</li>
        </ul>
      </FormatContainer>
    </>
  );
};

SampleTable.propTypes = {
  data: PropTypes.array.isRequired,
};

FormatContainer.propTypes = {
  isMobile: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  data: PropTypes.array.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired
};

UploadPanel.propTypes = {
  isMobile: PropTypes.bool,
};

export default UploadPanel;