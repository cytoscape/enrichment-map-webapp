import Express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

import Datastore, { DB_1 } from '../../datastore.js';
import { EM_SERVICE_URL, FGSEA_SERVICE_URL } from '../../env.js';


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
http.post('/create', tsvParser, async function(req, res, next) {
  try {
    console.log('Running /create endpoint.');
    console.time('create_endpoint');
    const rankedGeneListTSV = req.body;

    console.time('fgsea_service');
    const fgseaResultJson = await runFGSEA(rankedGeneListTSV);
    console.timeEnd('fgsea_service');

    console.time('em_service');
    const networkJson = await runEM(fgseaResultJson);
    console.timeEnd('em_service');

    console.log();
    console.time('mongo_create');
    const netID = await Datastore.createNetwork(networkJson);
    await Datastore.createRankedGeneList(rankedGeneListTSV, netID);
    console.timeEnd('mongo_create');

    res.send(netID);
    console.timeEnd('create_endpoint');
    console.log("Running /create endpoint - DONE. Network ID: " + netID);
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
    const network = await Datastore.getNetwork(netid);
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
 * Returns the rank of an individual gene.
 */
http.get('/:netid/gene/:gene', async function(req, res, next) {
  try {
    const { netid, gene } = req.params;
    const geneInfo = await Datastore.getGeneRank(netid, gene);
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
 * Returns the contents of a geneset given its name.
 * TODO: Add a query parameter that specifies the geneset database name.
 */
http.get('/geneset/:name', async function(req, res, next) {
  try {
    const { name } = req.params;
    const geneSet = await Datastore.getGeneSet(DB_1, name);
    console.log("here is the gene set: " + geneSet);
    if(geneSet) {
      res.send(JSON.stringify(geneSet));
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    next(err);
  }
});


/**
 * Returns the contents of a geneset, including ranks.
 */
http.get('/:netid/geneset/:name', async function(req, res, next) {
  try {
    const { netid, name } = req.params;
    const geneInfo = await Datastore.getGenesWithRanks(DB_1, netid, [name]);
    if(!geneInfo) {
      res.sendStatus(404);
    } else {
      res.send(JSON.stringify(geneInfo));
    }
  } catch (err) {
    next(err);
  }
});


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


async function runFGSEA(ranksTSV) {
  console.log(FGSEA_SERVICE_URL);
  console.log(ranksTSV);

  const response = await fetch(FGSEA_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/tab-separated-values' },
    body: ranksTSV
  });
  if(!response.ok) {
    console.error(response.status);
    console.error(response.statusText);
    console.error(response.size);
    
    const body = await response.text();

    console.error(body);

    throw new Error("Error running fgsea service.");
  }

  const enrichmentsJson = await response.json();

  console.log(enrichmentsJson);

  return enrichmentsJson;
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
    console.error(response.status);
    console.error(response.statusText);
    console.error(response.size);
    
    const body = await response.text();

    console.error(body);

    throw new Error("Error running em service.");
  }
  const networkJson = await response.json();
  return networkJson;
}


export default http;