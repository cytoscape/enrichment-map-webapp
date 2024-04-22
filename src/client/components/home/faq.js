import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import LinkOut from './link-out';
import { Typography } from '@material-ui/core';


const ulStyle = { marginTop: '0.5rem' };

const faqs = [
  [
    {
      question: <>What files can I upload?</>,
      answer: <>
        Currently the EnrichmentMap web app only supports gene lists as input.
        You can upload either a gene list that already has ranks or an RNA-seq expression file that contains read counts.
        Also, the file type must be <code>Excel</code>, <LinkOut href="https://en.wikipedia.org/wiki/Comma-separated_values"><code>CSV</code></LinkOut>&nbsp;
        or <LinkOut href="https://en.wikipedia.org/wiki/Tab-separated_values"><code>TSV</code></LinkOut>.
      </>,
    },
    {
      question: <>Can I upload GSEA and g:Profiler files?</>,
      answer: <>
        No, if you have already performed enrichment analysis using a package such as <LinkOut href="https://www.gsea-msigdb.org/gsea/index.jsp">GSEA</LinkOut>&nbsp;
        or <LinkOut href="https://biit.cs.ut.ee/gprofiler">g:Profiler</LinkOut>, 
        the results may be visualised using the <LinkOut href="https://apps.cytoscape.org/apps/enrichmentmap">EnrichmentMap App</LinkOut> for&nbsp;
        <LinkOut href="https://cytoscape.org/">Cytoscape</LinkOut>&mdash;<LinkOut href="https://enrichmentmap.readthedocs.io/en/latest/Gsea.html">more info</LinkOut>.
      </>,
    },
    {
      question: <>How is the enrichment analysis performed?</>,
      answer: <>
        EnrichmentMap performs the gene set enrichment analysis by using an <code>R</code> package called&nbsp;
        <LinkOut href="https://bioconductor.org/packages/release/bioc/html/fgsea.html">FGSEA</LinkOut> &#40;Fast Gene Set Enrichment Analysis&#41;. 
        The input to FGSEA is a ranked gene list. If you have a gene list that already has ranks then it can be used directly as input for FGSEA.
        If not, EnrichmentMap also accepts RNA-seq expression files that contain read counts.
        In this case, the replicates must be grouped into two experimental conditions &#40;e.g. treatment vs control&#41;.
        The read counts per gene are tested for differential expression and a rank is calculated for each gene.
        The resulting ranked gene list is then given to FGSEA.
        EnrichmentMap will provide the results of the gene rank calculations as well as the enrichment pathways.
      </>,
    },
    {
      question: <>What are the analysis parameters?</>,
      answer: <>
        The gene set filtering parameters are cutoff parameters used to filter the results of an enrichment analysis.
        Download the network images and data and then check the <code>README.md</code> file for the applied parameters.
      </>,
    },
    {
      question: <>What data does the app use?</>,
      answer: <>
        The enrichment analysis is performed against a <LinkOut href="https://baderlab.org/GeneSets">database of known pathways</LinkOut>&nbsp;
        that has been curated by <LinkOut href="https://baderlab.org/">Bader Lab</LinkOut> at the University of Toronto.
        This gene set collection is created from several sources.
      </>,
    },
  ], [
    {
      question: <>How do I save my network?</>,
      answer: <>
        Accounts are not supported right now. In order to save your results, you have the following options:
        <ul style={ulStyle}>
          <li>Create a <LinkOut href="https://www.pcmag.com/how-to/how-to-organize-sync-web-browser-bookmarks-chrome-edge-firefox">bookmark</LinkOut> using your web browser.</li>
          <li>Copy the URL in the browser address bar and save it.</li>
          <li>Download the network images and data&mdash;the <code>README.md</code> file contains the permanent link to the network.</li>
          <li>If you use the same browser, the home page shows the last 20 networks you opened.</li>
        </ul>
      </>,
    },
    {
      question: <>How do I interpret the EnrichmentMap network?</>,
      answer: <ul style={ulStyle}>
        <li>Nodes &#40;circles&#41; represent highly enriched gene sets &#40;pathways&#41;.</li>
        <li>Edges &#40;links between nodes&#41; represent similarity &#40;overlaps&#41; between gene sets.</li>
        <li>Groups of highly similar pathways are represented as tight clusters, which can be expanded to see their individual pathways.</li>
        <li>The network is laid out so that similar pathways are close together.</li>
        <li>Node color represents the NES of each pathway&mdash;blue for positive NES value and red for negative.</li>
      </ul>,
    },
    {
      question: <>What does NES mean?</>,
      answer: <>
        NES is the <i>Normalised Enrichment Score</i> of a pathway. It may be:
        <ul style={ulStyle}>
          <li>positive: when the pathway is up-regulated &#40;i.e. the pathway is more enriched in the experiment vs the control&#41;.</li> 
          <li>negative: when the pathway is down-regulated &#40;i.e. the pathway is less enriched in the experiment vs the control&#41;.</li> 
        </ul>
      </>,
    },
    {
      question: <>Can I import my network into Cytoscape?</>,
      answer: <>
        Yes, please read the instructions in the <code>README.md</code> file&mdash;included when you download the network images and data.
      </>,
    },
  ],
];


const useStyles =  makeStyles((theme) => ({
  root: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: theme.spacing(4),
    overflow: 'hidden',
    listStyle: 'none',
    lineHeight: '1.5rem',
    maxWidth: 'none',
    margin: 0,
    padding: 0,
    [theme.breakpoints.down('sm')]: {
      gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
      gap: 0,
    },
  },
  column: {
    listStyle: 'none',
    paddingInlineStart: 0,
  },
  entry: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
    [theme.breakpoints.down('sm')]: {
      marginBottom: 0,
    },
  },
  question: {
    fontWeight: 'bold',
    marginBottom: theme.spacing(2),
  },
}));

function Faq() {
  const classes = useStyles();

  return (
    <ul role="list" className={classes.root}>
    {faqs.map((column, columnIndex) => (
      <li key={columnIndex}>
        <ul role="list" className={classes.column}>
        {column.map((faq, faqIndex) => (
          <li key={faqIndex} className={classes.entry}>
            <Typography component="h3" variant="subtitle1" color="textPrimary" className={classes.question}>
              { faq.question }
            </Typography>
            <Typography component="div" variant="body2" color="textSecondary">
              { faq.answer }
            </Typography>
          </li>
        ))}
        </ul>
      </li>
    ))}
    </ul>
  );
}

export default Faq;