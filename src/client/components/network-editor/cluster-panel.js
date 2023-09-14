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
  title: {
    fontWeight: 'bold',
    marginBottom: '0.75em',
  },
  prop: {
    textAlign: 'left',
    marginBottom: '0.25em',
  },
  link: {
    color: theme.palette.link.main,
    "&[disabled]": {
      color: theme.palette.text.secondary,
      cursor: "default",
      "&:hover": {
        textDecoration: "none"
      }
    }
  },
  listItemIcon: {
    marginTop: '8px',
    minWidth: '24px',
  },
  bulletIcon: {
    fontSize: '0.875rem',
    color: theme.palette.divider,
    margin: 0,
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
      <ListItem key={idx} alignItems="flex-start" dense disableGutters>
        <ListItemIcon className={classes.listItemIcon}>
          <GSBulletIcon className={classes.bulletIcon} fontSize="small" />
        </ListItemIcon>
        <ListItemText primary={
          <Link
            href={href}
            disabled={href == null}
            variant="body2"
            color="textSecondary"
            className={classes.link}
            {...linkoutProps}
          >
            { name }
          </Link>
        } />
      </ListItem>
    );
  };

  const isCluster = node.data('mcode_cluster_id') != null;
  const pathwayNames = node.data('name');

  return (
    <Box>
      <Typography variant="subtitle1" color="textPrimary" className={classes.title}>{nodeLabel(node)}</Typography>
      <Typography variant="subtitle2" color="textPrimary" className={classes.prop}>NES: {node.data('NES')}</Typography>
      <Typography variant="subtitle2" color="textPrimary" className={classes.prop}>P value: {node.data('pvalue')}</Typography>
    {isCluster && pathwayNames && pathwayNames.length > 0 && (
      <>
        <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.prop} gutterBottom>
          Pathways ({pathwayNames.length}):
        </Typography>
        <Paper variant="outlined" style={{background: 'inherit'}}>
          <List dense disablePadding style={{overflow: 'auto', maxHeight: '25vh'}}>
            { pathwayNames.map((name, idx) => renderPathwayRow(name, idx)) }
          </List>
        </Paper>
      </>
    )}
    </Box>
  );
};

ClusterPanel.propTypes = {
  node: PropTypes.object.isRequired,
};

export default ClusterPanel;