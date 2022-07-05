import Express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

import Datastore from '../../datastore.js';
import { EM_SERVICE_URL, FGSEA_SERVICE_URL } from '../../env.js';


const http = Express.Router();
const tsvParser = bodyParser.text({ type: "text/tab-separated-values" });

http.post('/rankedtoem', tsvParser, async function(req, res, next) {
  try {
    console.log('Running /rankedtoem endpoint.');
    const rankedGeneList = req.body;

    console.log('  Running fgsea service');
    const fgseaResultJson = await runFGSEA(rankedGeneList);
    console.log('  Running fgsea service - DONE');

    console.log('  Running EM service');
    const networkJsonString = await runEM(fgseaResultJson);
    console.log('  Running EM service - DONE');

    console.log('  Creating Network Document');
    await Datastore.connect();
    const netID = await Datastore.createNetwork(networkJsonString);
    console.log('  Creating Network Document - DONE');

    res.send(netID); 
    console.log("Running /rankedtoem endpoint - DONE. Network ID: " + netID);
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