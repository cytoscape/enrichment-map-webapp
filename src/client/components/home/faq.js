import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import LinkOut from '../link-out';
import { Typography } from '@material-ui/core';


const ulStyle = { marginTop: '0.5rem' };

const faqs = [
  [
    {
      question: <>What is an EnrichmentMap network?</>,
      answer: <>
        EnrichmentMap performs gene set enrichment analysis on a gene list then visualizes the results as a network.
        Nodes represent gene sets &#40;pathways&#41; and edges represent similarity &#40;overlap&#41; between the gene sets.
        The network is then structured so that highly redundant gene sets are grouped together as clusters, 
        dramatically improving the capability to navigate and interpret enrichment results.
      </>,
    },
    {
      question: <>What files can I upload?</>,
      answer: <>
        Currently the EnrichmentMap web app only supports gene lists as input.
        You can upload either a <LinkOut download href="/sample-data/brca_hd_tep_ranks.rnk">gene list</LinkOut> that already has ranks
        or an <LinkOut download href="/sample-data/GSE129943_rsem_counts_HGNC_expr.txt">RNA-seq expression file</LinkOut> that contains read counts.
        The file type must be <code>Excel</code>, <LinkOut href="https://en.wikipedia.org/wiki/Comma-separated_values"><code>CSV</code></LinkOut>&nbsp;
        or <LinkOut href="https://en.wikipedia.org/wiki/Tab-separated_values"><code>TSV</code></LinkOut>.
        The gene names must be the identifiers from&nbsp;
        <LinkOut href="https://www.ensembl.org/Homo_sapiens/Info/Index">Ensembl</LinkOut> or&nbsp;
        <LinkOut href="https://www.genenames.org/">HGNC</LinkOut> for human only.
      </>,
    },
    {
      question: <>Can I upload GSEA and g:Profiler files?</>,
      answer: <>
        No, if you want to use&nbsp;
        <LinkOut href="https://www.gsea-msigdb.org/gsea/index.jsp">GSEA</LinkOut> or&nbsp;
        <LinkOut href="https://biit.cs.ut.ee/gprofiler">g:Profiler</LinkOut> results to create an EnrichmentMap network,
        you can use the <LinkOut href="https://apps.cytoscape.org/apps/enrichmentmap">EnrichmentMap App</LinkOut> for&nbsp;
        <LinkOut href="https://cytoscape.org/">Cytoscape</LinkOut>&mdash;<LinkOut href="https://enrichmentmap.readthedocs.io/en/latest/Gsea.html">more info</LinkOut>.
        However, if you still have the original gene list file used as input to GSEA,
        you can upload the file to EnrichmentMap web and perform a new enrichment analysis.
        The results will be available much faster than with GSEA.
        Unranked gene list files typically used as input for g:Profiler are currently not supported by this web app.
      </>,
    },
    {
      question: <>How long does the enrichment analysis take?</>,
      answer: <>
        On average it takes 1-2 minutes to create a network from an uploaded file.
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
        Please download the network images and data and then check the <code>README</code> file for the applied parameters.
      </>,
    },
    {
      question: <>What data does the app use?</>,
      answer: <>
        The enrichment analysis is performed against a <LinkOut href="https://baderlab.org/GeneSets">database of known pathways</LinkOut>&nbsp;
        for human, which has been curated from several sources by Bader Lab at the University of Toronto.  The current GMT file used is <code style={{wordBreak: "break-all", overflowWrap: "break-word"}}>Human_GOBP_AllPathways_noPFOCR_no_GO_iea_May_01_2024_symbol.gmt</code>.  The latest (i.e. current) and past versions used by this app are available for download on <LinkOut href="https://github.com/cytoscape/enrichment-map-webapp/tree/main/public/geneset-db">GitHub</LinkOut>.
      </>,
    },
    {
      question: <>How are low-count genes, batch effects, and outliers handled?</>,
      answer: <>
        <ul style={ulStyle}>
          <li>Low-count genes are filtered via edgeR, with the filterByExpr function.</li>
          <li>Batch effects are currently out of scope for the current version of the app. Please consider batch effects in your data collection in preparation for upload to the app.  You can use your own analysis with the app (e.g. R scripts) for the FGSEA/GSEA portion of the analysis to a produce a rank file that is free of batch effects.</li>
          <li>Sample outliers are currently out of scope for the current version of the app.  You can use a MDS/PCA plot in order to detect sample outliers in the interim.  You can use your own analysis with the app (e.g. R scripts) for the FGSEA/GSEA portion of the analysis to produce a rank file that takes sample outliers into account.</li>
        </ul>
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
          <li>Download the network images and data&mdash;the <code>README</code> file contains the permanent link to the network.</li>
          <li>If you use the same browser, the home page shows the last 20 networks you opened.</li>
        </ul>
      </>,
    },
    {
      question: <>How do I share my network?</>,
      answer: <>
        <ul style={ulStyle}>
          <li>To share your results with others, copy the URL in the browser address bar and send it via email or text.</li>
          <li>The network URL contains a unique code that allows access to your results. There is no way to access your results without its URL.</li>
          <li>Anyone with the URL will be able to see your results and make changes to the network layout.</li>
        </ul>
      </>,
    },
    {
      question: <>How is my data stored?</>,
      answer: <>
        <ul style={ulStyle}>
          <li>Your uploaded data file and the resulting enrichment analysis data is stored on our servers. We will not share this data with anyone, 
            and there is nothing connecting the data with your personal information. The data will be shared over time to make it conveniently accessible 
            to you, but older results may be deleted if we need to free space for new analyses.
          </li>
          <li>We use industry-standard technology to protect the security of the app and user data.</li>
          <li>Your data is private by default. Others can access your data or results only if you share the URL with them.</li>
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
        NES is the Normalised Enrichment Score of a pathway. It may be:
        <ul style={ulStyle}>
          <li>Positive: when the pathway is up-regulated &#40;i.e. the pathway is more enriched in the experiment vs the control&#41;.</li> 
          <li>Negative: when the pathway is down-regulated &#40;i.e. the pathway is less enriched in the experiment vs the control&#41;.</li> 
        </ul>
      </>,
    },
    {
      question: <>Can I import my network into Cytoscape?</>,
      answer: <>
        Yes, you first need to download and install <LinkOut href="https://cytoscape.org/download.html">Cytoscape</LinkOut> and then
        install the <LinkOut href="https://apps.cytoscape.org/apps/enrichmentmap">EnrichmentMap App</LinkOut> for Cytoscape.
        You can find the instructions in the <code>README</code> file&mdash;included when you download the network images and data.
      </>,
    },
    {
      question: <>What file is used to generate the demo?</>,
      answer: <>
        The rank (RNK) file used to generate the demo can be downloaded from <LinkOut href="https://github.com/cytoscape/enrichment-map-webapp/blob/main/public/sample-data/brca_hd_tep_ranks.rnk">GitHub (<code>brca_hd_tep_ranks.rnk</code>)</LinkOut>.
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

export function Faq() {
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