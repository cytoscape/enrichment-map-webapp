import React, { useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import { makeStyles } from '@material-ui/core/styles';

import { nodeLabel } from './network-style';

import { Box, Grid, Paper, Typography, Link } from '@material-ui/core';
import { List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';

import GSBulletIcon from '@material-ui/icons/FiberManualRecord';

const GS_DB_LINKS = [
  { db: 'BIOCYC',          url: (id) => `https://biocyc.org/HUMAN/NEW-IMAGE?type=PATHWAY&object=${id}&detail-level=0` },
  { db: 'HUMANCYC',        url: (id) => `https://humancyc.org/HUMAN/NEW-IMAGE?type=PATHWAY&object=${id}&detail-level=0` },
  { db: 'GOBP',            url: (id) => `https://www.ebi.ac.uk/QuickGO/term/${id}` },
  // { db: 'IOB',             url: (id) => `https://www.???/${id}` }, // TODO e.g. ALPHA6BETA4INTEGRIN%IOB%ALPHA6BETA4INTEGRIN
  { db: 'MSIGDB_C2',       url: (id) => `https://www.gsea-msigdb.org/gsea/msigdb/geneset_page.jsp?geneSetName=${id}` },
  { db: 'PANTHER PATHWAY', url: (id) => `http://www.pantherdb.org/pathway/pathDetail.do?clsAccession=${id}` },
  { db: 'PATHWHIZ',        url: (id) => `https://smpdb.ca/pathwhiz/pathways/${id}` },
  { db: 'REACTOME',        url: (id) => `https://reactome.org/content/detail/${id}` },
  { db: 'REACTOME DATABASE ID RELEASE 80', url: (id) => `https://reactome.org/content/detail/${id}` },
  { db: 'SMPDB',           url: (id) => `https://smpdb.ca/view/${id}` },
  { db: 'WIKIPATHWAYS_20220510', url: (id) => `https://www.wikipathways.org/index.php/Pathway:${id.replace('%HOMO SAPIENS', '')}` },
];

const linkoutProps = { target: "_blank",  rel: "noreferrer", underline: "hover" };

const useStyles = makeStyles((theme) => ({
  pathwayTitle: {
    fontSize: '1.25em',
    fontWeight: 'bold',
    marginBottom: '0.75em',
  },
  pathwayProp: {
    fontSize: '1em',
    textAlign: 'left',
    marginBottom: '0.25em',
  },
  gsLink: {
    fontSize: '0.875rem',
    textTransform: 'capitalize',
    color: theme.palette.link.main,
    "&[disabled]": {
      color: theme.palette.text.primary,
      cursor: "default",
      "&:hover": {
        textDecoration: "none"
      }
    }
  },
  gsListItemIcon: {
    marginTop: '8px',
    minWidth: '24px',
  },
  geneListItemIcon: {
    marginTop: 'auto',
    marginBottom: 'auto',
    minWidth: '24px',
  },
  bulletIcon: {
    fontSize: '0.875rem',
    color: theme.palette.divider,
  },
}));

const ClusterPanel = ({ node }) => {
  const classes = useStyles(); 

  const renderPathwayRow = (name, idx) => {
    let href = null;

    for (const { db, url } of GS_DB_LINKS) {
      const token = `%${db}%`;

      if (name.indexOf(token) >= 0) {
        const id = name.substring(name.lastIndexOf(token) + token.length, name.length);
        href = url(id);
        break;
      }
    }

    if (name.indexOf('%') >= 0) {
      name = name.substring(0, name.indexOf('%')).toLowerCase();
    }

    return (
      <ListItem key={idx} alignItems="flex-start" dense>
        <ListItemIcon className={classes.gsListItemIcon}>
          <GSBulletIcon className={classes.bulletIcon} />
        </ListItemIcon>
        <ListItemText
          primary={
          <Link
            href={href}
            disabled={href == null}
            variant="body2"
            color="textPrimary"
            className={classes.gsLink}
            {...linkoutProps}
          >
            { name }
          </Link>
          }
        />
      </ListItem>
    );
  };

  const isCluster = node.data('mcode_cluster_id') != null;
  const pathwayNames = node.data('name');

  return (
    <Box>
      <Typography className={classes.pathwayTitle}>{nodeLabel(node)}</Typography>
      <Typography className={classes.pathwayProp}>NES: {node.data('NES')}</Typography>
      <Typography className={classes.pathwayProp}>P value: {node.data('pvalue')}</Typography>
    {isCluster && pathwayNames.length > 0 && (
      <div style={{marginTop: '1em'}}>
        <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title} gutterBottom>
          Pathway{pathwayNames.length > 1 ? 's' : ''}:
        </Typography>
        <Paper variant="outlined" style={{background: 'inherit'}}>
          <List style={{padding: 0, margin: 0}}>
            { pathwayNames.map((name, idx) => renderPathwayRow(name, idx)) }
          </List>
        </Paper>
      </div>
    )}
    </Box>
  );
};

ClusterPanel.propTypes = {
  node: PropTypes.object.isRequired,
};

export default ClusterPanel;