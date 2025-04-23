import Express from 'express';
import fs from 'fs/promises';
import * as Sentry from "@sentry/node";
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import _ from 'lodash';
import Datastore, { GMT_2 } from '../../datastore.js';
import { rankedGeneListToDocument, fgseaServiceGeneRanksToDocument } from '../../datastore.js';
import { performance } from 'perf_hooks';
import { saveUserUploadFileToS3 } from './s3.js';
import { 
  EM_SERVICE_URL, 
  FGSEA_PRERANKED_SERVICE_URL, 
  FGSEA_RNASEQ_SERVICE_URL,
  BRIDGEDB_URL,
  MONGO_URL,
  NCBI_API_KEY,
} from '../../env.js';
import { cache } from '../../cache.js';


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
  const validation = await validateGenes(body, contentType, needIdMapping, '9606');
  body = validation.body;
  const invalidGenes = validation.invalidGenes;

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
    networkID = await Datastore.createNetwork(networkJson, networkName, type, GMT_FILE, invalidGenes, demo);
    await Datastore.initializeGeneRanks(GMT_FILE, networkID, rankedGeneList);
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
  });
  
  return networkID;
}

async function validateGenes(body, contentType, needIdMapping, taxon) {
  let invalidGenes = [];
  // If the IDs are Ensembl IDs, we need to convert them to HGNC IDs using the BridgeDB service.
  if (needIdMapping) {
    const mapping = await runEnsemblToHGNCMapping(body, contentType);
    body = mapping.body;
    invalidGenes = mapping.invalidIDs;
  } else {
    // We also need to check if any of the HGNC IDs are not supported by our database (from the imported GMT file).
    // The unrecognized gene symbols must be stored in the database.
    const lines = body.split('\n');
    const delim = contentType === 'text/csv' ? ',' : '\t';
    const content = lines
      .slice(1)
      .filter(line => line && line.length > 0)
      .map(line => line.split(delim));
    const geneSymbols = content.map(row => row[0]);
    const symbolsToValidate = [];

    geneSymbols.forEach(symbol => {
      // Check if the symbol is in the database
      if (!Datastore.hasGene(symbol)) {
        // Then check if it's already in the cache
        const cacheKey = `${taxon}-${symbol}`;
        const cachedGene = cache.get(cacheKey);
        if (!cachedGene) {
          symbolsToValidate.push(symbol);
        }
      }
    });
    console.log('>>>> Symbols to validate', symbolsToValidate);

    if (symbolsToValidate.length > 0) {
      invalidGenes = await validateGeneSymbols(symbolsToValidate, taxon);
    }
  }
  
  return { body, invalidGenes };
}

// async function validateGeneSymbols(symbols) {
//   const invalidSymbols = [];

//   try {
//     const response = await fetch('https://genemania.org/json/gene_validation',
//       {
//         method: 'POST',
//         body: JSON.stringify({
//           organism: 4,
//           genes: symbols.join('\n')
//         }),
//         headers: {
//           'Content-Type': 'application/json'
//         }
//       }
//     );
//     console.log(`==> Validating symbols`, response.status);

//     if (!response.ok) {
//       console.error(`Error validating symbols`, response.statusText);
//       // invalidSymbols.push(...chunk); // Mark all in this chunk as invalid
//       return;
//     }

//     const data = await response.json();

//     if (data?.genes) {
//       data.genes.forEach(entry => {
//         if (entry.type === 'INVALID') {
//           console.log(`--- INVALID symbol: ${entry.name}`);
//           invalidSymbols.push(entry.name);
//         }
//       });
//     }
//   } catch (error) {
//     console.error(`Error validating or processing symbols`, error);
//   }

//   return invalidSymbols;
// }

async function validateGeneSymbols(symbols, taxon) {
  const invalidSymbols = [];
  const baseUrl = `https://api.ncbi.nlm.nih.gov/datasets/v2/gene/symbol/`;
  const reportEndpoint = `/taxon/9606/dataset_report`;
  const chunkSize = 10;
  const delayMs = 1000; // 1 second

  async function processChunk(chunk) {
    const symbolsString = chunk.join(',');
    const url = baseUrl + encodeURIComponent(symbolsString) + reportEndpoint;
    const headers = { 
      'Content-Type': 'application/json',
      ...(NCBI_API_KEY && { 'api-key': NCBI_API_KEY }),
    };

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        console.error(`Error fetching chunk for symbols: ${chunk.join(',')}`, response.statusText);
        // invalidSymbols.push(...chunk); // Mark all in this chunk as invalid
        return;
      }

      const data = await response.json();
      const validatedSymbols = new Set();

      if (data?.reports) {
        data.reports.forEach(entry => {
          if (entry.query && entry.query.length > 0) {
            const symbol = entry.query[0];
            validatedSymbols.add(symbol);
            cache.set(`${taxon}-${symbol}`, entry);
          }
        });
      }

      console.log(`==> Validated symbols`, [...validatedSymbols].length);

      chunk.forEach(originalSymbol => {
        if (!validatedSymbols.has(originalSymbol)) {
          invalidSymbols.push(originalSymbol);
        }
      });
    } catch (error) {
      console.error(`Error fetching or processing chunk for symbols: ${chunk.join(',')}`, error);
      // Consider how you want to handle errors: retry, mark all as invalid, etc.
      // invalidSymbols.push(...chunk); // Mark all in this chunk as invalid on error for simplicity
    }

    return invalidSymbols;
  }

  const chunks = _.chunk(symbols, chunkSize);

  for (const chunk of chunks) {
    console.log(`==> Processing chunk: ${chunk.join(',')}...`);
    await processChunk(chunk);
    // Introduce a delay between chunk processing to avoid hitting API rate limits.
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  console.log(`>>>> Invalid symbols`, invalidSymbols.sort());

  return invalidSymbols.sort();
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
 * Sends a POST request to the BridgeDB xrefsBatch endpoint.
 * https://www.bridgedb.org/swagger/
 */
async function runBridgeDB(ensemblIDs, species='Human', sourceType='En') {
  // Note the 'dataSource' query parameter seems to have no effect.
  const url = `${BRIDGEDB_URL}/${species}/xrefsBatch/${sourceType}`;
  const body = ensemblIDs.join('\n');

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/html' }, // thats what it wants
      body
    });
  } catch(e) {
    throw new CreateError({ step: 'bridgedb', cause: e });
  }
  if(!response.ok) {
    const body = await response.text();
    const status = response.status;
    throw new CreateError({ step: 'bridgedb', body, status });
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

  const removeVersionCode = (ensID) => {
    const i = ensID.indexOf('.');
    if(i > 0) {
      return ensID.slice(0, i);
    }
    return ensID;
  };

  // Call BridgeDB
  const ensemblIDs = content.map(row => row[0]).map(removeVersionCode);

  const hgncIDs = await runBridgeDB(ensemblIDs);

  // Replace old IDs with the new ones
  const map = new Map();
  const newContent = [];
  const invalidIDs = [];
  for (var i = 0; i < content.length; i++) {
    const row = content[i];
    const newID = hgncIDs[i];
    if (newID) {
      map.set(row[0], newID);
      newContent.push([newID, ...row.slice(1)]);
    } else {
      invalidIDs.push(row[0]);
    }
  }

  if (invalidIDs.length > 0) {
    console.log("Sending id-mapping warning to Sentry. Number of invalid IDs: " + invalidIDs.length);
    // TODO uncomment this
    // sendMessagesToSentry('bridgedb', [{
    //   level: 'warning',
    //   type: 'ids_not_mapped',
    //   text: 'IDs not mapped',
    //   data: {
    //     'Total IDs Mapped': ensemblIDs.length, 
    //     'Invalid ID Count': invalidIDs.length,
    //     'Invalid IDs (First 100)': invalidIDs.slice(0, 100),
    //    }
    // }]);
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