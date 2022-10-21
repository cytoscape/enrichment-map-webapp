import React from 'react';
import PropTypes from 'prop-types';

import { linkoutProps } from './defaults';

import { makeStyles } from '@material-ui/core/styles';

import { List, ListItem, ListItemIcon, ListItemText, Link } from '@material-ui/core';

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

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    backgroundColor: theme.palette.background.default,
    maxHeight: '240px',
    overflowY: 'auto',
  },
  listItemIcon: {
    marginTop: '8px',
    minWidth: '24px',
  },
  bulletIcon: {
    fontSize: '0.875rem',
    color: theme.palette.divider,
  },
  linkout: {
    fontSize: '0.875rem',
    textTransform: 'capitalize',
    color: theme.palette.link.main,
    "&[disabled]": {
      color: theme.palette.text.primary,
      cursor: "default",
      "&:hover": {
        textDecoration: "none"
      }
    },
  },
}));

const GeneSetListPanel = ({ geneSetNames }) => {
  const classes = useStyles();

  const renderGeneSetRow = (gsName, idx) => {
    let href = null;

    for (const { db, url } of GS_DB_LINKS) {
      const token = `%${db}%`;

      if (gsName.indexOf(token) >= 0) {
        const id = gsName.substring(gsName.lastIndexOf(token) + token.length, gsName.length);
        href = url(id);
        break;
      }
    }

    if (gsName.indexOf('%') >= 0) {
      gsName = gsName.substring(0, gsName.indexOf('%')).toLowerCase();
    }

    return (
      <ListItem key={idx} alignItems="flex-start" dense>
        <ListItemIcon className={classes.listItemIcon}>
          <GSBulletIcon className={classes.bulletIcon} />
        </ListItemIcon>
        <ListItemText
          primary={
            <Link
              href={href}
              disabled={href == null}
              variant="body2"
              color="textPrimary"
              className={classes.linkout}
              {...linkoutProps}
            >
              {gsName}
            </Link>
          }
        />
      </ListItem>
    );
  };

  return (
    <List className={classes.root}>
      { geneSetNames.map((gsName, idx) => renderGeneSetRow(gsName, idx)) }
    </List>
  );
};

GeneSetListPanel.propTypes = {
  geneSetNames: PropTypes.array.isRequired,
};

export default GeneSetListPanel;