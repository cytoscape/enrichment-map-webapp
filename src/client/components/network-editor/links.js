const pathwayDBs = [
  {
    db: 'ARACYC',
    name: 'BioCyc',
    href: (id) => `https://biocyc.org/META/new-image?object=${id}`,
    // e.g. URACIL DEGRADATION I (REDUCTIVE)%ARACYC%PWY-3982
  },
  {
    db: 'BIOCYC',
    name: 'BioCyc',
    href: (id) => `https://biocyc.org/HUMAN/NEW-IMAGE?type=PATHWAY&object=${id}&detail-level=0`,
    // e.g. ESTRADIOL BIOSYNTHESIS II%BIOCYC%PWY-7306
  },
  {
    db: 'ECOCYC',
    name: 'EcoCyc',
    href: (id) => `https://ecocyc.org/ECOLI/NEW-IMAGE?object=${id}`,
    // e.g. FORMALDEHYDE OXIDATION II (GLUTATHIONE-DEPENDENT)%ECOCYC%PWY-1801
  },
  {
    db: 'GOBP',
    name: 'GO',
    href: (id) => `https://www.ebi.ac.uk/QuickGO/term/${id}`,
    // e.g. NEGATIVE REGULATION OF RYANODINE-SENSITIVE CALCIUM-RELEASE CHANNEL ACTIVITY%GOBP%GO:0060315
  },
  {
    db: 'HUMANCYC',
    name: 'HumanCyc',
    href: (id) => `https://humancyc.org/HUMAN/NEW-IMAGE?type=PATHWAY&object=${id}&detail-level=0`,
    // e.g. LEUKOTRIENE BIOSYNTHESIS%HUMANCYC%15354
  },
  // {
  //   db: 'IOB',
  //   name: 'TODO',
  //   href: (id) => `https://www.???/${id}`, //TODO
  //   // e.g. ALPHA6BETA4INTEGRIN%IOB%ALPHA6BETA4INTEGRIN
  // },
  {
    db: 'MSIGDB_C2',
    name: 'MSigDB',
    href: (id) => `https://www.gsea-msigdb.org/gsea/msigdb/geneset_page.jsp?geneSetName=${id}`,
    // e.g. PID_E2F_PATHWAY%MSIGDB_C2%PID_E2F_PATHWAY
  },
  {
    db: 'PANTHER PATHWAY',
    name: 'PANTHER',
    href: (id) => `http://www.pantherdb.org/pathway/pathDetail.do?clsAccession=${id}`,
    // e.g. TCA CYCLE%PANTHER PATHWAY%P00051
  },
  {
    db: 'PATHWAY INTERACTION DATABASE NCI-NATURE CURATED DATA',
    name: 'NCI-Nature Curated',
    href: (id) => `https://www.ncbi.nlm.nih.gov/search/all/?term=${id}`,
    // e.g. S1P3 PATHWAY%PATHWAY INTERACTION DATABASE NCI-NATURE CURATED DATA%S1P3 PATHWAY
  },
  {
    db: 'PATHWHIZ',
    name: 'PathWhiz',
    href: (id) => `https://smpdb.ca/pathwhiz/pathways/${id}`,
    // e.g. FRUCTOSE METABOLISM%PATHWHIZ%PW122616
  },
  {
    db: 'REACTOME',
    name: 'Reactome',
    href: (id) => `https://reactome.org/content/detail/${id}`,
    // e.g. DEFECTIVE MTR CAUSES HMAG%REACTOME%R-HSA-3359469.2
  },
  {
    db: 'REACTOME DATABASE ID RELEASE 80',
    name: 'Reactome',
    href: (id) => `https://reactome.org/content/detail/${id}`
    // e.g. G ALPHA (I) SIGNALLING EVENTS%REACTOME DATABASE ID RELEASE 80%418594
  },
  {
    db: 'SMPDB',
    name: 'SMPDB',
    href: (id) => `https://smpdb.ca/view/${id}`,
    // e.g. EUMELANIN BIOSYNTHESIS%SMPDB%SMP0121124
  },
  {
    db: 'WIKIPATHWAYS_20220510',
    name: 'WikiPathways',
    href: (id) => `https://www.wikipathways.org/index.php/Pathway:${id.replace('%HOMO SAPIENS', '')}`,
    // e.g. STEROL REGULATORY ELEMENT-BINDING PROTEINS (SREBP) SIGNALING%WIKIPATHWAYS_20220510%WP1982%HOMO SAPIENS
  },
];


export function pathwayDBLinkOut(pathway) {
  for (const { db, name, href } of pathwayDBs) {
    const token = `%${db}%`;

    if (pathway.indexOf(token) >= 0) {
      const id = pathway.substring(pathway.lastIndexOf(token) + token.length, pathway.length);
      return { name, href: href(id) };
    }
  }

  return null;
}