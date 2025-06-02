import Express from 'express';
import fs from 'fs/promises';
import * as Sentry from "@sentry/node";
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import Datastore, { GMT_2 } from '../../datastore.js';
import { rankedGeneListToDocument, fgseaServiceGeneRanksToDocument } from '../../datastore.js';
import { parseBridgeDBXrefsList } from '../../util.js';
import { performance } from 'perf_hooks';
import { saveUserUploadFileToS3 } from './s3.js';
import { 
  EM_SERVICE_URL, 
  FGSEA_PRERANKED_SERVICE_URL, 
  FGSEA_RNASEQ_SERVICE_URL,
  BRIDGEDB_URL,
  GPROFILER_SERVICE_URL,
  MONGO_URL,
} from '../../env.js';

const NETWORK_CREATE_ERROR_CODE = 450;

const http = Express.Router();
const GMT_FILE = GMT_2;

// Endpoints accept TSV or CSV
const dataParser = bodyParser.text({ 
  type: ['text/tab-separated-values', 'text/csv'],
  limit: '50mb' 
});

/*
 * Runs the FGSEA/EnrichmentMap algorithms, saves the 
 * created network, then returns its ID.
 */
http.post('/preranked', dataParser, async function(req, res, next) {
  try {
    await runDataPipelineHttp(req, res, 'preranked');
  } catch (err) {
    next(err);
  }
});

/*
 * Runs the FGSEA/EnrichmentMap algorithms, saves the 
 * created network, then returns its ID.
 */
http.post('/rnaseq', dataParser, async function(req, res, next) {
  try {
    await runDataPipelineHttp(req, res, 'rnaseq');
  } catch (err) {
    next(err);
  }
});

/*
 * Runs the FGSEA/EnrichmentMap algorithms, saves the 
 * created network, then returns its ID.
 */
http.post('/demo', async function(req, res, next) {
  const perf = createPeformanceHook();
  try {
    const rankFile = './public/geneset-db/brca_hd_tep_ranks.rnk';
    let data = await fs.readFile(rankFile, 'utf8');
    
    const networkID = await runDataPipeline({
      demo: true,
      networkName: 'Demo Network',
      contentType: 'text/tab-separated-values',
      type: 'preranked',
      body: data,
      perf
    });

    res.send(networkID);
  } catch (err) {
    next(err);
  } finally {
    perf.dispose();
  }
});


function createPeformanceHook() {
  const tag = Date.now();
  const markNames = [];
  return {
    startTime: new Date(),
    mark: name => {
      const markName = `${name}-${tag}`;
      console.log('  running ' + markName);
      performance.mark(markName);
      markNames.push(markName);
    },
    measure: ({ from, to }) => {
      const { duration } = performance.measure(from, `${from}-${tag}`, `${to}-${tag}`);
      return duration;
    },
    dispose: () => {
      markNames.forEach(m => performance.clearMarks(m));
    }
  };
}


async function runDataPipelineHttp(req, res, type) {
  const { networkName } = req.query;
  const contentType = req.get('Content-Type'); // use same content type with FGSEA service
  let body = req.body;
  const { classes } = req.query;

  const perf = createPeformanceHook();
  try {
    await runDataPipeline({ networkName, contentType, type, classes, body, perf }, res);
  } finally {
    perf.dispose();
  }
}


async function runDataPipeline({ networkName, contentType, type, classes, body, demo, perf }, res) {
  console.log('/api/create/');
  // n.b. no await so as to not block
  saveUserUploadFileToS3(body, `${networkName}.csv`, contentType);

  const preranked = type === 'preranked';

  // First we need to check if the IDs are ensembl IDs.
  // If they are, we need to convert them to HGNC IDs using the BridgeDB service.
  perf.mark('bridgedb');
  const needIdMapping = isEnsembl(body);
  const validation = await validateGenes(body, contentType, needIdMapping);
  body = validation.body;
  const unknownGenes = validation.unknownGenes;

  perf.mark('fgsea');
  let rankedGeneList;
  let pathwaysForEM;
  if(preranked) {
    const fgseaRes = await runFGSEApreranked(body, contentType);
    const { pathways, gmtFile } = fgseaRes;
    if(gmtFile !== GMT_FILE) {
      throw new CreateError({ step: 'fgsea', detail: 'gmt', message: `FGSEA: wrong GMT. Expected '${GMT_FILE}', got '${gmtFile}'.` });
    }
    const delim = contentType === 'text/csv' ? ',' : '\t';
    rankedGeneList = rankedGeneListToDocument(body, delim);
    pathwaysForEM = pathways;
  } else {
    // Messages from FGSEA are basically just warning about non-finite ranks
    const fgseaRes = await runFGSEArnaseq(body, classes, contentType);
    const { ranks, pathways, messages, gmtFile } = fgseaRes;
    if(gmtFile !== GMT_FILE) {
      throw new CreateError({ step: 'fgsea', detail: 'gmt', message: `FGSEA: wrong GMT. Expected '${GMT_FILE}', got '${gmtFile}'.` });
    }
    sendMessagesToSentry('fgsea', messages);
    rankedGeneList = fgseaServiceGeneRanksToDocument(ranks);
    pathwaysForEM = pathways;
  }

  perf.mark('em');
  const networkJson = await runEM(pathwaysForEM, demo);
  if(isEmptyNetwork(networkJson)) {
    throw new CreateError({ step: 'em', detail: 'empty' });
  }
  if(networkJson.gmtFile !== GMT_FILE) {
    throw new CreateError({ step: 'em', detail: 'gmt', message: `EM-Service: wrong GMT. Expected '${GMT_FILE}', got '${networkJson.gmtFile}'.` });
  }

  let networkID;
  try {
    perf.mark('mongo');
    networkID = await Datastore.createNetwork(networkJson, networkName, type, GMT_FILE, unknownGenes, demo);
    await Datastore.initializeGeneRanks(GMT_FILE, networkID, rankedGeneList, demo);
    res?.send(networkID);
  } catch(e) {
    throw new CreateError({ step: 'mongo', cause: e });
  }

  perf.mark('end');

  Datastore.createPerfDocument(networkID, {
    startTime: perf.startTime,
    emptyNetwork: typeof networkID === 'undefined',
    geneCount: rankedGeneList?.genes?.length,
    steps: [ {
      step: 'bridgedb',
      needIdMapping,
      url: BRIDGEDB_URL,
      timeTaken: perf.measure({ from:'bridgedb', to:'fgsea' }),
    }, {
      step: 'fgsea',
      type,
      url: preranked ? FGSEA_PRERANKED_SERVICE_URL : FGSEA_RNASEQ_SERVICE_URL,
      timeTaken: perf.measure({ from:'fgsea', to:'em' }),
    }, {
      step: 'em',
      url: EM_SERVICE_URL,
      timeTaken: perf.measure({ from:'em', to:'mongo' }),
    }, {
      step: 'mongo',
      url: MONGO_URL,
      timeTaken: perf.measure({ from:'mongo', to:'end' }),
    }]
  }, demo);
  
  return networkID;
}


async function validateGenes(body, contentType, needIdMapping) {
  // If the IDs are Ensembl IDs, we need to convert them to HGNC IDs using the BridgeDB service.
  let invalidEnsemblIDs;
  let ensemblToSymbolMap;
  let symbolToEnsemblMap;
  if (needIdMapping) {
    const mapping = await runEnsemblToHGNCMapping(body, contentType);
    body = mapping.body;
    ensemblToSymbolMap = mapping.map;
    invalidEnsemblIDs = mapping.invalidIDs;
    // Create another map with inverted the key/value pairs so we can later look up the Ensembl ID by HGNC ID
    if (ensemblToSymbolMap) {
      symbolToEnsemblMap = new Map();
      ensemblToSymbolMap.forEach((symbol, ensID) => {
        if (symbol) {
          symbolToEnsemblMap.set(symbol, ensID);
        }
      });
    }
  }

  // We also need to check if any of the HGNC IDs are not supported by our database (from the imported GMT file).
  // The unrecognized gene symbols must be stored in the database.
  const lines = body.split('\n');
  const delim = contentType === 'text/csv' ? ',' : '\t';
  const content = lines
    .slice(1)
    .filter(line => line && line.length > 0)
    .map(line => line.split(delim));
  const geneSymbols = content.map(row => row[0]);
  
  const unrecognizedSymbolSet = new Set();
  for (const symbol of geneSymbols) {
    const recognized = Datastore.hasGene(symbol);
    if (!recognized) {
      unrecognizedSymbolSet.add(symbol);
    }
  }

  // Create a list with objects containing the HGNC ID and the Ensembl ID for all invalid/unrecognized genes
  const unknownGenes = [];
  // Genes that were not mapped to HGNC IDs (the ensembl IDs were not recognized by BridgeDB)
  if (invalidEnsemblIDs) {
    for (const ensemblID of invalidEnsemblIDs) {
      unknownGenes.push({ ensemblID });
    }
  }
  // Genes that were not in our database
  for (const symbol of unrecognizedSymbolSet) {
    const ensemblID = symbolToEnsemblMap ? symbolToEnsemblMap.get(symbol) : undefined;
    unknownGenes.push({ ensemblID, symbol });
  }

  return { body, unknownGenes };
}


function isEmptyNetwork(networkJson) {
  return !(networkJson.network?.elements?.nodes?.length) 
      || !(networkJson.summaryNetwork?.elements?.nodes?.length);
}


async function runFGSEApreranked(ranksData, contentType) {
  let response;
  try {
    response = await fetch(FGSEA_PRERANKED_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: ranksData
    });
  } catch(e) {
    throw new CreateError({ step: 'fgsea', type: 'preranked', cause: e });
  }
  if(!response.ok) {
    const body = await response.text();
    const status = response.status;
    throw new CreateError({ step: 'fgsea', type: 'preranked', body, status });
  }
  return await response.json();
}


async function runFGSEArnaseq(countsData, classes, contentType) {
  const url = FGSEA_RNASEQ_SERVICE_URL + '?' + new URLSearchParams({ classes });
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: countsData
    });
  } catch(e) {
    throw new CreateError({ step: 'fgsea', type: 'rnaseq', cause: e });
  }
  if(!response.ok) {
    const body = await response.text();
    const status = response.status;
    throw new CreateError({ step: 'fgsea', type: 'rnaseq', body, status });
  }
  return await response.json();
}


async function runEM(fgseaResults, demo) {
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

      // parameters only used by the demo network
      ...(demo && { 
        qvalue: 0.0001,
        similarityMetric: "JACCARD", 
        similarityCutoff: 0.5,
      })
    }
  };

  let response;
  try {
    response = await fetch(EM_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch(e) {
    throw new CreateError({ step: 'em', cause: e });
  }
  if(!response.ok) {
    const body = await response.text();
    const status = response.status;
    throw new CreateError({ step: 'em', body, status });
  }
  return await response.json();
}


/**
 * If the first gene is an ensembl ID then assume they all are.
 */
function isEnsembl(body) {
  const secondLine = body.split('\n', 2)[1]; // First line is the header row, skip it
  return secondLine && secondLine.startsWith('ENS');
}

/**
 * Converts Ensembl IDs to HGNC symbols using the g:Convert API.
 * https://biit.cs.ut.ee/gprofiler/page/apis
 */
async function runGProfiler(ensemblIds, organism='hsapiens') {
  const url = `${GPROFILER_SERVICE_URL}/convert/convert/`;

  const requestBody = {
    organism,
    query: ensemblIds,
    target: 'ENSG'
  };

  try {
    const start = performance.now();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'EnrichmentMap:RNA-Seq'
      },
      body: JSON.stringify(requestBody)
    });

    const duration = performance.now() - start;
    console.log(`--> g:Convert fetch took ${duration.toFixed(2)} ms`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const results = await response.json();

    // Build a mapping from input ID to symbol
    const idToSymbolMap = {};
    results.result.forEach(entry => {
      // console.log(`--> ${entry.incoming} -> ${entry.name} (${entry.converted})`);
      idToSymbolMap[entry.incoming] = entry.name === 'None' ? null : entry.name;
    });

    // // Map back to original order
    // const symbols = ensemblIds.map(id => idToSymbolMap[id] || null);
    // console.log('>>> Ensembl to Symbol Mapping:', symbols);
    // // log the number of nulls
    // const nullCount = symbols.filter(symbol => symbol === null).length;
    // console.log(`>>> Number of null symbols: ${nullCount}`);

    return idToSymbolMap;
  } catch (error) {
    console.error('Error converting Ensembl IDs:', error.message);
    return ensemblIds.map(() => null); // Return nulls on failure
  }
}


/**
 * Sends a POST request to the BridgeDB xrefsBatch endpoint.
 * https://www.bridgedb.org/swagger/#/mappings/post__organism__xrefsBatch__systemCode_
 */
async function runBridgeDB(ensemblIDs, species='Human', sourceType='En') {
  // Note the 'dataSource' query parameter seems to have no effect.
  const url = `${BRIDGEDB_URL}/${species}/xrefsBatch/${sourceType}`;
  const body = ensemblIDs.join('\n');

  let response;
  try {
    const start = performance.now();

    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/html' }, // thats what it wants
      body
    });

    const duration = performance.now() - start;
    console.log(`--> BridgeDB fetch took ${duration.toFixed(2)} ms`);
  } catch(e) {
    throw new CreateError({ step: 'bridgedb', cause: e });
  }
  if(!response.ok) {
    const body = await response.text();
    const status = response.status;
    throw new CreateError({ step: 'bridgedb', body, status });
  }

  const responseBody = await response.text();
  const symbols = parseBridgeDBXrefsList(responseBody);
  
  return symbols;
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

  const removeVersionCode = (ensID) => {
    const i = ensID.indexOf('.');
    if(i > 0) {
      return ensID.slice(0, i);
    }
    return ensID;
  };

  // Call BridgeDB
  const ensemblIDs = content.map(row => row[0]).map(removeVersionCode);
  // const symbols = await runBridgeDB(ensemblIDs);
  const idToSymbolMap = await runGProfiler(ensemblIDs);

  // Replace old IDs with the new ones
  const map = new Map();
  const newContent = [];
  const invalidIDs = [];
  for(let i = 0; i < content.length; i++) {
    const row = content[i];
    const ensemblID = ensemblIDs[i];
    const newID = idToSymbolMap[ensemblID];
    // const newID = symbols[i];
    if(newID) {
      map.set(row[0], newID);
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
  
  return { body: newBody, map, invalidIDs };
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



class CreateError extends Error {
  constructor(details) {
    const { message, cause } = details;
    super(message ? message : "Network Creation Error", { cause });
    this.details = details;
  }  
}

export function createRouterErrorHandler(err, req, res, next) {
  if(err instanceof CreateError) {
    console.log(err);
    res
      .status(NETWORK_CREATE_ERROR_CODE)
      .send({ details: err.details });
  } else {
    next(err);
  }
}


export default http;