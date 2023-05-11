import Express from 'express';
import * as Sentry from "@sentry/node";
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import Datastore, { DB_1 } from '../../datastore.js';
import { 
  EM_SERVICE_URL, 
  FGSEA_PRERANKED_SERVICE_URL, 
  FGSEA_RNASEQ_SERVICE_URL,
  BRIDGEDB_URL,
} from '../../env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const http = Express.Router();

// Endpoints accept TSV or CSV
const dataParser = bodyParser.text({ 
  type: ['text/tab-separated-values', 'text/csv'],
  limit: '50mb' 
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

/**
 * Get file names of sample input data.
 */
http.get('/sample-data', async function(req, res, next) {
  try {
    const files = await fs.promises.readdir(path.join(__dirname, '../../../../', 'public/sample-data'));

    const sanitizedFiles = files
      .filter(f => !f.startsWith('.'))
      .sort();

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
    const { nodeLimit=50 } = req.query;

    const network = await Datastore.getNetwork(netid, { nodeLimit });
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

/*
 * Runs the FGSEA/EnrichmentMap algorithms, saves the 
 * created network, then returns its ID.
 */
http.post('/create/preranked', dataParser, async function(req, res, next) {
  try {
    await runDataPipeline(req, res, 'preranked');
  } catch (err) {
    next(err);
  }
});

/*
 * Runs the FGSEA/EnrichmentMap algorithms, saves the 
 * created network, then returns its ID.
 */
http.post('/create/rnaseq', dataParser, async function(req, res, next) {
  try {
    await runDataPipeline(req, res);
  } catch (err) {
    next(err);
  }
});


async function runDataPipeline(req, res, preranked) {
  const { networkName } = req.query;
  const contentType = req.get('Content-Type'); // use same content type with FGSEA service
  let body = req.body;
  const tag = Date.now();

  console.log('/api/create/ ' + tag + ', Content-Type:' + contentType);
  console.time('/api/create/ ' + tag);
  
  if(isEnsembl(body)) {
    console.time(' bridgedb ' + tag );
    body = await runEnsemblToHGNCMapping(body, contentType);
    console.timeEnd(' bridgedb ' + tag );
  }

  let rankedGeneList;
  let pathwaysForEM;

  if(preranked) {
    console.time(' fgsea_preranked_service ' + tag);
    const { pathways } = await runFGSEApreranked(body, contentType);
    console.timeEnd(' fgsea_preranked_service ' + tag);

    const delim = contentType === 'text/csv' ? ',' : '\t';
    rankedGeneList = Datastore.rankedGeneListToDocument(body, delim);
    pathwaysForEM = pathways;
  } else {
    console.time(' fgsea_rnaseq_service ' + tag);
    const { classes } = req.query;
    const { ranks, pathways, messages } = await runFGSEArnaseq(body, classes, contentType);
    sendMessagesToSentry('fgsea', messages);
    console.timeEnd(' fgsea_rnaseq_service ' + tag);

    rankedGeneList = Datastore.fgseaServiceGeneRanksToDocument(ranks);
    pathwaysForEM = pathways;
  }

  console.time(' em_service ' + tag);
  const networkJson = await runEM(pathwaysForEM);
  console.timeEnd(' em_service ' + tag);

  // TODO check for empty network here

  console.time(' mongo ' + tag);
  const netID = await Datastore.createNetwork(networkJson, networkName);
  await Datastore.createRankedGeneList(rankedGeneList, netID);
  console.timeEnd(' mongo ' + tag);

  res.send(netID);
  console.timeEnd('/api/create/ ' + tag);
}


async function runFGSEApreranked(ranksData, contentType) {
  const response = await fetch(FGSEA_PRERANKED_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: ranksData
  });
  if(!response.ok) {
    throw new Error("Error running fgsea preranked service.");
  }
  return await response.json();
}


async function runFGSEArnaseq(countsData, classes, contentType) {
  const url = FGSEA_RNASEQ_SERVICE_URL + '?' + new URLSearchParams({ classes });
  console.log(url);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: countsData
  });
  if(!response.ok) {
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
      // These parameters correspond to the fields in EMCreationParametersDTO
      // similarityMetric: "JACCARD", 
      // similarityCutoff: 0.25,
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


/**
 * If the first gene is an ensembl ID then assume they all are.
 */
function isEnsembl(body) {
  const secondLine = body.split('\n', 2)[1]; // First line is the header row, skip it
  return secondLine && secondLine.startsWith('ENS');
}


/**
 * Sends a POST request to the BridgeDB xrefsBatch endpoint.
 * https://www.bridgedb.org/swagger/
 */
async function runBridgeDB(ensemblIDs, species='Human', sourceType='En') {
  // Note the 'dataSource' query parameter seems to have no effect.
  const url = `${BRIDGEDB_URL}/${species}/xrefsBatch/${sourceType}`;
  const body = ensemblIDs.join('\n');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/html' }, // thats what it wants
    body
  });
  if(!response.ok) {
    throw new Error("Error running BridgeDB xrefsBatch service.");
  }

  const responseBody = await response.text();

  // Parse response to get symbol names
  const hgncIDs = responseBody
    .split('\n')
    .map(line => {
      const symbol = line.split(',').filter(m => m.startsWith('H:'))[0];
      return symbol && symbol.slice(2); // remove 'H:'
    });
    
  return hgncIDs;
}


async function runEnsemblToHGNCMapping(body, contentType) {
  // Convert CSV/TSV to a 2D array 
  const lines = body.split('\n');
  const header  = lines[0];
  const delim = contentType === 'text/csv' ? ',' : '\t';

  const content = lines
    .slice(1)
    .filter(line => line && line.length > 0)
    .map(line => line.split(delim));

  // Call BridgeDB
  const ensemblIDs = content.map(row => row[0]);
  // console.log(ensemblIDs);
  const hgncIDs = await runBridgeDB(ensemblIDs);
  // console.log(hgncIDs);

  // Replace old IDs with the new ones
  const newContent = [];
  const invalidIDs = [];
  for(var i = 0; i < content.length; i++) {
    const row = content[i];
    const newID = hgncIDs[i];
    if(newID) {
      newContent.push([newID, ...row.slice(1)]);
    } else {
      invalidIDs.push(row[0]);
    }
  }

  if(invalidIDs.length > 0) {
    console.log("Sending id-mapping warning to Sentry. Number of invalid IDs: " + invalidIDs.length);
    sendMessagesToSentry('bridgedb', [{
      level: 'warning',
      type: 'ids_not_mapped',
      text: 'IDs not mapped',
      data: {
        'Total IDs Mapped': ensemblIDs.length, 
        'Invalid ID Count': invalidIDs.length,
        'Invalid IDs (First 100)': invalidIDs.slice(0, 100),
       }
    }]);
  } 

  // Convert back to a big string
  const newBody = header + '\n' + newContent.map(line => line.join(delim)).join('\n');
  return newBody;
}


function sendMessagesToSentry(service, messages) {
  if(!messages || messages.length == 0)
    return;

  for(const message of messages) {
    const { level, type, text, data } = message;
    
    // https://docs.sentry.io/platforms/node/usage/set-level/
    const event = {
      level,
      tags: { message_type:type, service },
      message: "Service Message: " + text,
      extra: data,
    };

    // This method is actually asynchronous
    // https://github.com/getsentry/sentry-javascript/issues/2049
    Sentry.captureEvent(event);
  }
}


export default http;