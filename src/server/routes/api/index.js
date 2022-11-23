import Express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import Datastore, { DB_1 } from '../../datastore.js';

import { 
  EM_SERVICE_URL, 
  FGSEA_PRERANKED_SERVICE_URL, 
  FGSEA_RNASEQ_SERVICE_URL 
} from '../../env.js';


const __dirname = dirname(fileURLToPath(import.meta.url));

const http = Express.Router();

const tsvParser = bodyParser.text({ 
  type: "text/tab-separated-values", 
  limit: '1mb' 
});


/*
 * This is just for pinging the server.
 */
http.get('/', async function(req, res) {
  res.send("OK");
});

/*
 * This is for simulating a server error, useful for debugging.
 */
http.get('/iamerror', async function(req, res) {
  res.sendStatus(500);
});


/*
 * Runs the FGSEA/EnrichmentMap algorithms, saves the 
 * created network, then returns its ID.
 */
http.post('/create/preranked', tsvParser, async function(req, res, next) {
  try {
    const tag = Date.now();
    console.log('/create/preranked' + tag);
    console.time('/create/preranked ' + tag);
    const rankedGeneListTSV = req.body;

    console.log('fgsea_preranked_service ' + tag);
    console.time('fgsea_preranked_service ' + tag);
    const { pathways } = await runFGSEApreranked(rankedGeneListTSV);
    console.timeEnd('fgsea_preranked_service ' + tag);

    console.log('em_service ' + tag);
    console.time('em_service ' + tag);
    const networkJson = await runEM(pathways);
    console.timeEnd('em_service ' + tag);

    console.time('mongo ' + tag);
    const netID = await Datastore.createNetwork(networkJson);
    const rankedGeneList = Datastore.rankedGeneListTSVToDocument(rankedGeneListTSV);
    await Datastore.createRankedGeneList(rankedGeneList, netID);

    res.send(netID);
    console.timeEnd('/create/preranked ' + tag);
  } catch (err) {
    next(err);
  }
});

/*
 * Runs the FGSEA/EnrichmentMap algorithms, saves the 
 * created network, then returns its ID.
 */
http.post('/create/rnaseq', tsvParser, async function(req, res, next) {
  try {
    const tag = Date.now();
    console.time('/create/rnaseq ' + tag);
    const rnaSeqCountsTSV = req.body;
    const classes = req.query.classes;

    console.time('fgsea_rnaseq_service ' + tag);
    const { ranks, pathways } = await runFGSEArnaseq(rnaSeqCountsTSV, classes);
    console.timeEnd('fgsea_rnaseq_service ' + tag);

    console.time('em_service ' + tag);
    const networkJson = await runEM(pathways);
    console.timeEnd('em_service ' + tag);

    const netID = await Datastore.createNetwork(networkJson);
    const rankedGeneList = Datastore.fgseaServiceGeneRanksToDocument(ranks);
    await Datastore.createRankedGeneList(rankedGeneList, netID);

    res.send(netID);
    console.timeEnd('/create/preranked ' + tag);
  } catch (err) {
    next(err);
  }
});

/**
 * Get file names of sample input data.
 */
http.get('/sample-data', async function(req, res, next) {
  try {
    const files = await fs.promises.readdir(path.join(__dirname, '../../../../', 'public/sample-data'));

    const sanitizedFiles = ( files
      .filter(f => !f.startsWith('.'))
      .sort()
    );

    res.send(sanitizedFiles);
  } catch (err) {
    next(err);
  }
});

/* 
 * Returns a network given its ID.
 */
http.get('/:netid', async function(req, res, next) {
  try {
    const { netid } = req.params;
    const { full } = req.query;
    const network = await Datastore.getNetwork(netid, full);
    if(!network) {
      res.sendStatus(404);
    } else {
      res.send(JSON.stringify(network));
    }
  } catch (err) {
    next(err);
  }
});

/* 
 * Update the network data given its ID--right now, this only supports updating the 'networkName'.
 */
http.put('/:netid', async function(req, res, next) {
  try {
    const { netid } = req.params;
    const { networkName } = req.body;
    const updated = await Datastore.updateNetwork(netid, { networkName });
    
    res.sendStatus(updated ? 204 : 409);
  } catch (err) {
    next(err);
  }
});

/*
 * Returns the contents of multiple gene sets, not including ranks.
 */
 http.post('/genesets', async function(req, res, next) {
  try {
    const { geneSets } = req.body;
    if(!Array.isArray(geneSets)) {
      res.sendStatus(404);
      return;
    }

    const geneInfo = await Datastore.getGeneSets(DB_1, geneSets);
    if(!geneInfo) {
      res.sendStatus(404);
    } else {
      res.send(JSON.stringify(geneInfo));
    }
  } catch (err) {
    next(err);
  }
});

/*
 * Returns the contents of multiple gene sets, including ranks.
 */
 http.post('/:netid/genesets', async function(req, res, next) {
  try {
    const { netid } = req.params;
    const { geneSets } = req.body;
    if(!Array.isArray(geneSets)) {
      res.sendStatus(404);
      return;
    }

    const geneInfo = await Datastore.getGenesWithRanks(DB_1, netid, geneSets);
    if(!geneInfo) {
      res.sendStatus(404);
    } else {
      res.send(JSON.stringify(geneInfo));
    }
  } catch (err) {
    next(err);
  }
});

/*
 * Returns a ranked gene list.
 */
 http.get('/:netid/ranks', async function(req, res, next) {
  try {
    const { netid } = req.params;

    const rankedGeneList = await Datastore.getRankedGeneList(netid);
    if(!rankedGeneList) {
      res.sendStatus(404);
    } else {
      res.send(JSON.stringify(rankedGeneList));
    }
  } catch (err) {
    next(err);
  }
});

/*
 * Uses mongo do to a gene search.
 */
http.post('/:netid/genesearch', async function(req, res, next) {
  try {
    const { netid } = req.params;
    const { genes } = req.body;
    if(!Array.isArray(genes)) {
      res.sendStatus(404);
      return;
    }

    const geneInfo = await Datastore.searchGenes(DB_1, netid, genes);
    console.log(geneInfo);
    if(!geneInfo) {
      res.sendStatus(404);
    } else {
      res.send(JSON.stringify(geneInfo));
    }
  } catch (err) {
    next(err);
  }
});


async function runFGSEApreranked(ranksTSV) {
  const response = await fetch(FGSEA_PRERANKED_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/tab-separated-values' },
    body: ranksTSV
  });
  if(!response.ok) {
    const text = await response.text();
    console.log(text);
    throw new Error("Error running fgsea preranked service.");
  }
  return await response.json();
}


async function runFGSEArnaseq(countsTSV, classes) {
  const url = FGSEA_RNASEQ_SERVICE_URL + '?' + new URLSearchParams({ classes });
  console.log(url);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/tab-separated-values' },
    body: countsTSV
  });
  if(!response.ok) {
    const text = await response.text();
    console.log(text);
    throw new Error("Error running fgsea rnaseq service.");
  }
  return await response.json();
}


async function runEM(fgseaResults) {
  const body = {
    // We only support one dataSet
    dataSets: [{
      name: "EM Web",
      method: "FGSEA",
      fgseaResults
    }],
    parameters: {
      // Reduces number of edges
      similarityMetric: "JACCARD", 
      similarityCutoff: 0.25,
      // Reduces number of nodes
      qvalueFilterMaxNodes: 800,
    }
  };

  const response = await fetch(EM_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!response.ok) {
    throw new Error("Error running em service.");
  }
  const networkJson = await response.json();
  return networkJson;
}


export default http;