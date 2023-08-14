import Express from 'express';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import Datastore, { DB_1 } from '../../datastore.js';


const DEFAULT_NETWORK_SIZE = 50; // Max number of nodes to return when showing the network.

const __dirname = dirname(fileURLToPath(import.meta.url));
const http = Express.Router();


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
    const { nodeLimit = DEFAULT_NETWORK_SIZE } = req.query;

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
    const { nodeLimit = DEFAULT_NETWORK_SIZE } = req.query;
    const { geneSets } = req.body;
    if(!Array.isArray(geneSets)) {
      console.log("what?");
      console.log(geneSets);
      res.sendStatus(404);
      return;
    }

    const geneInfo = await Datastore.getGenesWithRanks(DB_1, netid, geneSets, { nodeLimit });
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

/**
 * Returns the IDs of nodes that contain the given gene.
 */
http.get('/:netid/:gene/nodes', async function(req, res, next) {
  try {
    const { netid, gene } = req.params;
    const nodeIDs = await Datastore.getNodesContainingGene(netid, gene);
    if(!nodeIDs) {
      res.sendStatus(404);
    } else {
      res.send(JSON.stringify(nodeIDs));
    }
  } catch (err) {
    next(err);
  }
});

export default http;