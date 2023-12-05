import Express from 'express';
import * as Sentry from "@sentry/node";
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import Datastore, { DB_1 } from '../../datastore.js';
import { performance } from 'perf_hooks';
import { 
  EM_SERVICE_URL, 
  FGSEA_PRERANKED_SERVICE_URL, 
  FGSEA_RNASEQ_SERVICE_URL,
  BRIDGEDB_URL,
  MONGO_URL,
} from '../../env.js';
import { saveUserUploadFileToS3 } from './s3.js';

const http = Express.Router();


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
      markNames.forEach(performance.clearMarks);
    }
  };
}


async function runDataPipelineHttp(req, res, type) {
  const { networkName } = req.query;
  const contentType = req.get('Content-Type'); // use same content type with FGSEA service
  let body = req.body;
  const { classes } = req.query;

  await runDataPipeline({ networkName, contentType, type, classes, body }, res);
}


export async function runDataPipeline({ networkName, contentType, type, classes, body, demo }, res) {
  const preranked = type === 'preranked';

  console.log('/api/create/');
  const perf = createPeformanceHook();

  // n.b. no await so as to not block
  saveUserUploadFileToS3(body, `${networkName}.csv`, contentType);

  perf.mark('bridgedb');
  const needIdMapping = isEnsembl(body);
  if(needIdMapping) {
    body = await runEnsemblToHGNCMapping(body, contentType);
  }

  perf.mark('fgsea');
  let rankedGeneList;
  let pathwaysForEM;
  if(preranked) {
    const { pathways } = await runFGSEApreranked(body, contentType);
    const delim = contentType === 'text/csv' ? ',' : '\t';
    rankedGeneList = Datastore.rankedGeneListToDocument(body, delim);
    pathwaysForEM = pathways;
  } else {
    const { ranks, pathways, messages } = await runFGSEArnaseq(body, classes, contentType);
    sendMessagesToSentry('fgsea', messages);
    rankedGeneList = Datastore.fgseaServiceGeneRanksToDocument(ranks);
    pathwaysForEM = pathways;
  }

  perf.mark('em');
  const networkJson = await runEM(pathwaysForEM);

  perf.mark('mongo');
  let networkID;
  if(isEmptyNetwork(networkJson)) {
    console.log('sending empty network');
    res?.status(422)?.send("Empty Network");
  } else {
    networkID = await Datastore.createNetwork(networkJson, networkName, type, DB_1, demo);
    await Datastore.initializeGeneRanks(DB_1, networkID, rankedGeneList);
    res?.send(networkID);
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
  
  perf.dispose();
}


function isEmptyNetwork(networkJson) {
  return !(networkJson.network?.elements?.nodes?.length) 
      || !(networkJson.summaryNetwork?.elements?.nodes?.length);
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