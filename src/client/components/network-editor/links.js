const pathwayDBs = [
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

export function pathwayDBLinkOut(pathway) {
  for (const { db, url } of pathwayDBs) {
    const token = `%${db}%`;

    if (pathway.indexOf(token) >= 0) {
      const id = pathway.substring(pathway.lastIndexOf(token) + token.length, pathway.length);
      return url(id);
    }
  }

  return null;
}