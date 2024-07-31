import Express from 'express';
import Datastore from '../../datastore.js';

const http = Express.Router();

// Return enrichment results in TSV format
http.get('/enrichment/:netid', async function(req, res, next) {
  try {
    const { netid } = req.params;
    const cursor = await Datastore.getEnrichmentResultsCursor(netid);

    sendDataLines(cursor, res, {
      header: 'pathway\tsize\tpval\tpadj\tNES',
      objToStr: ({name, size, pval, padj, NES}) => `${name}\t${size}\t${pval}\t${padj}\t${NES}`
    });

  } catch(err) {
    next(err);
  }
});


// Return ranked gene list in TSV format
http.get('/ranks/:netid', async function(req, res, next) {
  try {
    const { netid } = req.params;
    const cursor = await Datastore.getRankedGeneListCursor(netid);

    sendDataLines(cursor, res, {
      header: 'gene\trank',
      objToStr: ({gene, rank}) => `${gene}\t${rank}`
    });

  } catch(err) {
    next(err);
  }
});


// Return ranked gene list in TSV format
http.get('/gmt/:netid', async function(req, res, next) {
  try {
    const { netid } = req.params;
    const cursor = await Datastore.getGMTUsedByNetworkCursor(netid);

    sendDataLines(cursor, res, {
      header: 'name\tdescription\tgenes',
      objToStr: ({name, description, genes}) => {
        const genesStr = genes.join('\t');
        return `${name}\t${description}\t${genesStr}`;
      }
    });

  } catch(err) {
    next(err);
  }
});


async function sendDataLines(cursor, res, { type='tsv', header, objToStr } ) {
  try {
    if(!(await cursor.hasNext())) {
      res.sendStatus(404);
      return;
    }

    res.type(type);
    if(header) {
      res.write(header);
      res.write('\n');
    }

    while(await cursor.hasNext()) {
      const obj = await cursor.next();
      const str = objToStr(obj);
      res.write(str);
      res.write('\n');
    }
    // DO NOT add a newline at the end of the file, it will break EM-desktop
    
  } finally {
    cursor.close();
    res.end();
  }
}


export default http;