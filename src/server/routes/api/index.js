import Express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

import Datastore from '../../datastore.js';
import { GenesetDB, DB_1_PATH } from '../../geneset-db.js';
import { EM_SERVICE_URL, FGSEA_SERVICE_URL } from '../../env.js';



const genesetDB = new GenesetDB(DB_1_PATH);

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
    const networkJsonString = await runEM(fgseaResultJson);
    console.timeEnd('em_service');

    console.log();
    console.time('mongo_create');
    await Datastore.connect();
    const netID = await Datastore.createNetwork(networkJsonString);
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
http.get('/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    const network = await getNetwork(id);
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
 * Returns the gene rank.
 */
http.get('/:id/gene/:gene', async function(req, res, next) {
  try {
    const { id, gene } = req.params;
    const geneInfo = await getGene(id, gene);
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

    await genesetDB.connect();
    const entry = genesetDB.getEntry(name);

    if(entry) {
      res.send(JSON.stringify(entry));
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    next(err);
  }
});


async function getNetwork(netID) {
  console.log('Running get network endpoint.');
  await Datastore.connect();
  const network = await Datastore.getNetwork(netID);
  console.log('Running get network endpoint - DONE');
  return network;
}

async function getGene(netID, geneName) {
  console.log('Running get gene endpoint.');
  await Datastore.connect();
  const network = await Datastore.getGeneInfo(netID, geneName);
  console.log('Running get gene endpoint - DONE');
  return network;
}

async function runFGSEA(ranksTSV) {
  const response = await fetch(FGSEA_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/tab-separated-values' },
    body: ranksTSV
  });
  if(!response.ok) {
    throw new Error("Error running fgsea service.");
  }

  const enrichmentsJson = await response.text();
  return enrichmentsJson;
}


async function runEM(enrichmentsJson) {
  // TODO, Can we stream the JSON that surrounds the enrichmentJson, instead of building a string in memory?
  const body = `{
    "dataSets": [ {
        "name": "FGSEA Test",
        "method": "FGSEA",
        "fgseaResults": ${enrichmentsJson}
      }
    ]
  }`;

  console.log(body);
  const response = await fetch(EM_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  if(!response.ok) {
    throw new Error("Error running em service.");
  }
  const networkJson = await response.text();
  return networkJson;
}


export default http;