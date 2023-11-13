import React from 'react';
import {
  BioCycIcon,
  EcoCycIcon,
  GOIcon,
  HumanCycIcon,
  IOBIcon,
  MSigDBIcon,
  NCIIcon,
  PantherIcon,
  PathwayCommonsIcon,
  PathWhizIcon,
  ReactomeIcon,
  SMPDBIcon,
  WikiPathwaysIcon,
} from '../svg-icons';


const pathwayDBs = [
  {
    db: 'ARACYC',
    name: 'BioCyc',
    icon: (className) => <BioCycIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `https://biocyc.org/META/new-image?object=${id}`,
    // e.g. URACIL DEGRADATION I (REDUCTIVE)%ARACYC%PWY-3982
  },
  {
    db: 'BIOCYC',
    name: 'BioCyc',
    icon: (className) => <BioCycIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `https://biocyc.org/HUMAN/NEW-IMAGE?type=PATHWAY&object=${id}&detail-level=0`,
    // e.g. ESTRADIOL BIOSYNTHESIS II%BIOCYC%PWY-7306
  },
  {
    db: 'ECOCYC',
    name: 'EcoCyc',
    icon: (className) => <EcoCycIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `https://ecocyc.org/ECOLI/NEW-IMAGE?object=${id}`,
    // e.g. FORMALDEHYDE OXIDATION II (GLUTATHIONE-DEPENDENT)%ECOCYC%PWY-1801
  },
  {
    db: 'GOBP',
    name: 'GO',
    icon: (className) => <GOIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `https://www.ebi.ac.uk/QuickGO/term/${id}`,
    // e.g. NEGATIVE REGULATION OF RYANODINE-SENSITIVE CALCIUM-RELEASE CHANNEL ACTIVITY%GOBP%GO:0060315
  },
  {
    db: 'HUMANCYC',
    name: 'HumanCyc',
    icon: (className) => <HumanCycIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `https://humancyc.org/HUMAN/NEW-IMAGE?type=PATHWAY&object=${id}&detail-level=0`,
    // e.g. LEUKOTRIENE BIOSYNTHESIS%HUMANCYC%15354
  },
  {
    db: 'IOB',
    name: 'IOB (Netpath)',
    icon: (className) => <IOBIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `https://apps.pathwaycommons.org/search?datasource=netpath&q=${id}&type=Pathway`,
    // e.g. ALPHA6BETA4INTEGRIN%IOB%ALPHA6BETA4INTEGRIN
  },
  {
    db: 'MSIGDB_C2',
    name: 'MSigDB',
    icon: (className) => <MSigDBIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `https://www.gsea-msigdb.org/gsea/msigdb/geneset_page.jsp?geneSetName=${id}`,
    // e.g. PID_E2F_PATHWAY%MSIGDB_C2%PID_E2F_PATHWAY
  },
  {
    db: 'PANTHER PATHWAY',
    name: 'PANTHER',
    icon: (className) => <PantherIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `http://www.pantherdb.org/pathway/pathDetail.do?clsAccession=${id}`,
    // e.g. TCA CYCLE%PANTHER PATHWAY%P00051
  },
  {
    db: 'PATHWAY INTERACTION DATABASE NCI-NATURE CURATED DATA',
    name: 'NCI-Nature Curated',
    icon: (className) => <NCIIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `https://apps.pathwaycommons.org/search?datasource=pid&q=${id}&type=Pathway`,
    // e.g. S1P3 PATHWAY%PATHWAY INTERACTION DATABASE NCI-NATURE CURATED DATA%S1P3 PATHWAY
  },
  {
    db: 'PATHWHIZ',
    name: 'PathWhiz',
    icon: (className) => <PathWhizIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `https://smpdb.ca/pathwhiz/pathways/${id}`,
    // e.g. FRUCTOSE METABOLISM%PATHWHIZ%PW122616
  },
  {
    db: 'REACTOME',
    name: 'Reactome',
    icon: (className) => <ReactomeIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `https://reactome.org/content/detail/${id}`,
    // e.g. DEFECTIVE MTR CAUSES HMAG%REACTOME%R-HSA-3359469.2
  },
  {
    db: 'REACTOME DATABASE ID RELEASE 80',
    name: 'Reactome',
    icon: (className) => <ReactomeIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `https://reactome.org/content/detail/${id}`
    // e.g. G ALPHA (I) SIGNALLING EVENTS%REACTOME DATABASE ID RELEASE 80%418594
  },
  {
    db: 'SMPDB',
    name: 'SMPDB',
    icon: (className) => <SMPDBIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `https://smpdb.ca/view/${id}`,
    // e.g. EUMELANIN BIOSYNTHESIS%SMPDB%SMP0121124
  },
  {
    db: 'WIKIPATHWAYS_20220510',
    name: 'WikiPathways',
    icon: (className) => <WikiPathwaysIcon className={className} />, // eslint-disable-line react/prop-types
    href: (id) => `https://www.wikipathways.org/index.php/Pathway:${id.replace('%HOMO SAPIENS', '')}`,
    // e.g. STEROL REGULATORY ELEMENT-BINDING PROTEINS (SREBP) SIGNALING%WIKIPATHWAYS_20220510%WP1982%HOMO SAPIENS
  },
];


export function pathwayDBLinkOut(pathway) {
  for (const { db, name, href, icon } of pathwayDBs) {
    const token = `%${db}%`;

    if (pathway.indexOf(token) >= 0) {
      const id = pathway.substring(pathway.lastIndexOf(token) + token.length, pathway.length);
      return { name, href: href(id), icon: icon };
    }
  }

  // If missing in our database
  let db = pathway;
  let name = pathway;
  if (pathway.indexOf('%') >= 0) {
    const tokens = pathway.split('%');
    if (tokens.length === 3) {
      db = name = tokens[1];
    }
  }
  const icon = (className) => <PathwayCommonsIcon className={className} />;
  const href = `https://apps.pathwaycommons.org/search?q=${pathway}&type=Pathway`;

  return { db, name, href, icon };
}