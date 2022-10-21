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

/**
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


/**
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


/**
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


/**
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


async function runFGSEA(ranksTSV) {
  const response = await fetch(FGSEA_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/tab-separated-values' },
    body: ranksTSV
  });
  if(!response.ok) {
    throw new Error("Error running fgsea service.");
  }

  const enrichmentsJson = await response.json();
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
    throw new Error("Error running em service.");
  }
  const networkJson = await response.json();
  return networkJson;
}


export default http;