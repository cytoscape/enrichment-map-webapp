import React, { useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { RNA_SEQ, PRE_RANKED } from './upload-controller';

import { makeStyles, useTheme } from '@material-ui/core/styles';

import { ArcherContainer, ArcherElement } from 'react-archer';
import { Paper, Typography, Link } from '@material-ui/core';
import { Accordion, AccordionDetails, AccordionSummary, Radio } from '@material-ui/core';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@material-ui/core';

import ExpandMoreIcon from '@material-ui/icons/ExpandMore';


const createRankedRow = (gene, rank) => {
  return { gene, rank };
};

const createRnaSeqRow = (gene, sample1, sample2, others, samplen) => {
  return { gene, sample1, sample2, others, samplen };
};

const RANKED_HEADER = [
  {
    id: 'gene',
    label: 'Gene',
  },
  {
    id: 'rank',
    label: 'Rank',
  },
];
const RANKED_ROWS = [
  createRankedRow('ANKRD9',  50.62464011),
  createRankedRow('LYL1',    21.57521227),
  createRankedRow('ABHD17A', 11.96322182),
  createRankedRow('EVA1B',   -10.07102147),
  createRankedRow('FOXO3',   -24.77997781),
];

const RNASEQ_HEADER = [
  {
    id: 'gene',
    label: 'Gene',
  },
  {
    id: 'sample1',
    label: 'Sample 1',
  },
  {
    id: 'sample2',
    label: 'Sample 2',
  },
  {
    id: 'others',
    label: '...',
  },
  {
    id: 'samplen',
    label: <>Sample <i>n</i></>,
  }
];
const RNASEQ_ROWS = [
  createRnaSeqRow('MUC1',   950, 550, '...', 471),
  createRnaSeqRow('MUC6',   103, 338, '...', 603),
  createRnaSeqRow('GCNT1',  890, 640, '...', 209),
  createRnaSeqRow('B3GNT9', 700, 910, '...', 929),
  createRnaSeqRow('GALNT9', 730, 804, '...', 996),
];

//==[ SampleTable ]===================================================================================================

const useSampleTableStyles = makeStyles((theme) => ({
  tableContainer: {
    background: theme.palette.background.default,
    marginLeft: 20,
    marginRight: 20,
    [theme.breakpoints.down('xs')]: {
      marginLeft: 0,
      marginRight: 0,
    },
  },
  tableHead: {
  },
  tableCell: {
    fontSize: '0.85em',
    fontFamily: 'Monaco,Courier New,Monospace',
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    color: theme.palette.text.secondary,
    [theme.breakpoints.down('xs')]: {
      paddingTop: theme.spacing(0.25),
      paddingBottom: theme.spacing(0.25),
    },
  },
  tableHeadCell: {
    paddingTop: theme.spacing(1.25),
    paddingBottom: theme.spacing(1.25),
    borderBottom: `4px double ${theme.palette.divider}`,
    verticalAlign: 'top',
    [theme.breakpoints.down('xs')]: {
      paddingTop: 'inherit',
      paddingBottom: 'inherit',
    },
  },
  geneTableHeadCell: {
    borderTop: `4px double ${theme.palette.text.accent}`,
  },
  sample1TableHeadCell: {
    borderTop: `4px double ${theme.palette.primary.main}`,
  },
  sample2TableHeadCell: {
    borderTop: `4px double ${theme.palette.primary.main}`,
  },
  othersTableHeadCell: {
    borderTop: `4px double ${theme.palette.primary.main}`,
  },
  samplenTableHeadCell: {
    borderTop: `4px double ${theme.palette.primary.main}`,
  },
  rankTableHeadCell: {
    borderTop: `4px double ${theme.palette.primary.main}`,
  },
  spotlight: {
    backgroundColor: theme.palette.action.hover,
  },
}));

const SampleTable = ({ tableHead, tableRows, spotlight, isMobile }) => {
  const classes = useSampleTableStyles();
  const keys = Object.keys(tableRows[0]);
  const spotlightTokens = spotlight ? spotlight.split(',') : [];

  return (
    <Paper className={classes.tableContainer} variant="outlined">
      <Table size="small">
        <TableHead className={classes.tableHead}>
          <TableRow>
          {tableHead.map(({ id, label }, idx) => (
            <ArcherElement key={id} id={`${id}-th`}>
              <TableCell
                align={idx === 0 ? 'left' : 'center'}
                className={clsx(classes.tableCell, { [classes.tableHeadCell]: true, [classes[`${id}TableHeadCell`]]: true, [classes.spotlight]: (spotlightTokens.includes(id)) })}
              >
                {label}
              </TableCell>
            </ArcherElement>
          ))}
          </TableRow>
        </TableHead>
        <TableBody>
        {tableRows.map((row, ridx) => (
          (!isMobile || ridx < 3) && (
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
        )))}
        </TableBody>
      </Table>
    </Paper>
  );
};
SampleTable.propTypes = {
  tableHead: PropTypes.array.isRequired,
  tableRows: PropTypes.array.isRequired,
  spotlight: PropTypes.string,
  isMobile: PropTypes.bool.isRequired,
};

//==[ FormatAccordion ]===============================================================================================

const useFormatAccordionStyles = makeStyles((theme) => ({
  summaryRoot: {
    minHeight: `48px !important`,
    padding: theme.spacing(0, 2, 0, 1),
    [theme.breakpoints.down('xs')]: {
      padding: theme.spacing(0, 1, 0, 0),
    },
  },
  summaryContent: {
    alignItems: 'center',
    margin: `${theme.spacing(0.5, 0)} !important`,
  },
  title: {
    fontSize: 'theme.typography.pxToRem(15)',
    fontWeight: theme.typography.fontWeightRegular,
  },
  details: {
    width: '100%',
    justifyContent: 'center',
    padding: theme.spacing(0.5, 2, 1, 2),
    [theme.breakpoints.down('xs')]: {
      padding: theme.spacing(0.5, 1, 1, 1),
    },
  },
}));

const FormatAccordion = ({ id, title, children, selected, onChange }) => {
  const classes = useFormatAccordionStyles();

  return (
    <Accordion expanded={selected} variant="outlined" onChange={onChange(id)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} classes={{ root: classes.summaryRoot, content: classes.summaryContent }}>
        <Radio
          checked={selected}
          onChange={onChange(id)}
          value={id}
          name={title}
        />
        <Typography className={classes.title}>{ title }</Typography>
      </AccordionSummary>
      <AccordionDetails className={classes.details}>
        { children }
      </AccordionDetails>
    </Accordion>
  );
};
FormatAccordion.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  selected: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

//==[ UploadPanel ]===================================================================================================

const useUploadPanelStyles = makeStyles((theme) => ({
  description: {
    marginBottom: theme.spacing(2.5),
    [theme.breakpoints.down('xs')]: {
      marginBottom: theme.spacing(1),
      fontSize: '0.85rem',
    },
  },
  details: {
    marginTop: 0,
    [theme.breakpoints.down('xs')]: {
      marginBlockStart: 0,
      marginBlockEnd: theme.spacing(1),
      fontSize: '0.85rem',
    },
  },
  archerContainer: {
    width: '100%',
  },
  legendContainer: {
    width: '100%',
  },
  legend: {
    position:'absolute',
    padding: 5,
    fontSize: '0.85em',
    color: theme.palette.text.secondary,
    cursor: 'default',
    border: `1px solid transparent`,
    "&:hover": {
      color: theme.palette.text.primary,
    },
  },
  linkout: {
    color: 'inherit',
    borderBottom: 'dotted 1px',
  },
  exampleLink: {
    fontSize: theme.typography.caption.fontSize,
    textAlign: 'right',
    marginTop: theme.spacing(0.5),
    marginLeft: 20,
    marginRight: 20,
    [theme.breakpoints.down('xs')]: {
      marginLeft: 0,
      marginRight: 0,
    },
  }
}));

export function UploadPanel({ isMobile, initialFormat, onFormatChanged }) {
  const [ format, setFormat ] = useState(initialFormat);
  const [ spotlight, setSpotlight ] = useState();

  const classes = useUploadPanelStyles();
  const theme = useTheme();
  
  const handleChange = (value) => (event, select) => {
    if (select) { // clicking an expanded accordion should not collapse it
      setFormat(value);
      onFormatChanged(value);
    }
  };
  const handleMouseOver = (text) => {
    setSpotlight(text);
  };
  const handleMouseOut = () => {
    setSpotlight(null);
  };

  const linkoutProps = { target: "_blank",  rel: "noreferrer", underline: "none" };
  const GeneIdLabel = () => (
    <>
      <b>Gene ID Column:</b>&nbsp;&nbsp;from&nbsp;
      <Link href="https://www.ensembl.org/Homo_sapiens/Info/Index" className={classes.linkout} {...linkoutProps}>Ensembl</Link> or&nbsp;
      <Link href="https://www.genenames.org/" className={classes.linkout} {...linkoutProps}>HGNC</Link>&nbsp;
      &#40;for human&#41;
    </>
  );

  const SampleLink = ({ url }) => (
    <div className={classes.exampleLink}>
      <Link href={url} download target="_blank" rel="noreferrer">
        Example
      </Link>
    </div>
  );

  return (
    <>
      <Typography component="p" variant="body1" className={classes.description}>
        Upload your file (<code>CSV</code>, <code>TSV</code> or <code>Excel</code>) in one of the formats below:
      </Typography>
      <FormatAccordion
        id={RNA_SEQ}
        title="RNA-Seq Expression Data"
        selected={format === RNA_SEQ}
        onChange={handleChange}
      >
        <ArcherContainer
          strokeWidth={2}
          strokeDasharray="2,4"
          lineStyle="straight"
          className={classes.archerContainer}
        >
          <div className={classes.legendContainer} style={{ height: 160 }}>
            <ArcherElement
              id="legend1"
              relations={[{ targetId: 'gene-th', sourceAnchor: 'bottom', targetAnchor: 'top', style: { strokeColor: theme.palette.text.accent } }]}
            >
              <div
                className={classes.legend}
                style={{ top: 0, left: 0, maxWidth: 200 }}
                onMouseOver={() => handleMouseOver('gene')}
                onMouseOut={() => handleMouseOut()}
              >
                <GeneIdLabel />
              </div>
            </ArcherElement>
            <ArcherElement
              id="legend2"
              relations={[{ targetId: 'sample2-th', sourceAnchor: 'bottom', targetAnchor: 'top', style: { strokeColor: theme.palette.primary.main } }]}
            >
              <div
                className={classes.legend}
                style={{ top: 60, left: (isMobile ? 100 : 150), maxWidth: 220 }}
                onMouseOver={() => handleMouseOver('sample1,sample2,others,samplen')}
                onMouseOut={() => handleMouseOut()}
              >
                <b>Expression Columns:</b>&nbsp;&nbsp;2 or more numeric columns &#40;e.g. raw counts&#41;
              </div>
            </ArcherElement>
          </div>
          <SampleTable tableHead={RNASEQ_HEADER} tableRows={RNASEQ_ROWS} spotlight={spotlight} isMobile={isMobile} />
          <SampleLink url="/sample-data/GSE129943_rsem_counts_HGNC_expr.txt" />
        </ArcherContainer>
      </FormatAccordion>
      <FormatAccordion
        id={PRE_RANKED}
        title="Pre-Ranked Gene List"
        selected={format === PRE_RANKED}
        onChange={handleChange}
      >
        <ArcherContainer
          strokeWidth={2}
          strokeDasharray="2,4"
          lineStyle="straight"
          className={classes.archerContainer}
        >
          <div className={classes.legendContainer} style={{ height: 160 }}>
            <ArcherElement
              id="legend1"
              relations={[{ targetId: 'gene-th', sourceAnchor: 'bottom', targetAnchor: 'top', style: { strokeColor: theme.palette.text.accent } }]}
            >
              <div
                className={classes.legend}
                style={{ top: 0, left: 0, maxWidth: 200 }}
                onMouseOver={() => handleMouseOver('gene')}
                onMouseOut={() => handleMouseOut()}
              >
                <GeneIdLabel />
              </div>
            </ArcherElement>
            <ArcherElement
              id="legend2"
              relations={[{ targetId: 'rank-th', sourceAnchor: 'bottom', targetAnchor: 'top', style: { strokeColor: theme.palette.primary.main } }]}
            >
              <div
                className={classes.legend}
                style={{ top: 60, left: 'calc((100% / 2) - 25px)', maxWidth: 170 }}
                onMouseOver={() => handleMouseOver('rank')}
                onMouseOut={() => handleMouseOut()}
              >
                <b>Gene Ranks Column:</b>&nbsp;&nbsp;the numeric ranks
              </div>
            </ArcherElement>
          </div>
          <SampleTable tableHead={RANKED_HEADER} tableRows={RANKED_ROWS} spotlight={spotlight} isMobile={isMobile} />
          <SampleLink url="/sample-data/brca_hd_tep_ranks.rnk" />
        </ArcherContainer>
      </FormatAccordion>
    </>
  );
}
UploadPanel.propTypes = {
  isMobile: PropTypes.bool,
  initialFormat: PropTypes.string.isRequired,
  onFormatChanged: PropTypes.func.isRequired,
};

//==[ DemoPanel ]=====================================================================================================

const useDemoPanelStyles = makeStyles((theme) => ({
  thumbnail: {
    backgroundColor: theme.palette.background.network,
    border: `4px solid ${theme.palette.divider}`,
    borderRadius: '8px',
    width: '100%',
    margin: theme.spacing(2.5, 0, 2.5, 0),
  },
}));

export function DemoPanel() {
  const classes = useDemoPanelStyles();
  return <>
    <Typography component="p" variant="body1" className={classes.description}>
      Create a demo network from RNA-Seq data.
    </Typography>
    <img
      className={classes.thumbnail}
      alt="thumbnail of demo network"
      src="/images/demo_small.png"
    />
    <Typography component="p" variant="body1">
      The data used to create this network is described in the&nbsp;
      <Link 
          target="_blank" // open in new tab
          rel="noopener"
          href="https://www.pathwaycommons.org/guide/workflows/rna_seq_to_enrichment_map/process_data/">
        RNA-Seq Tutorial on Pathway Commons
      </Link>.
    </Typography>
  </>;
}
DemoPanel.propTypes = {
};

