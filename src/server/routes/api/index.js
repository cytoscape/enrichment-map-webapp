import Express from 'express';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import Datastore, { DB_1 } from '../../datastore.js';


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


/*
 * Returns the contents of multiple gene sets, including ranks.
 * Can be used to populate the gene search documents on the clinent.
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
 * Returns the min and max ranks for the given network.
 */
http.get('/:netid/minmaxranks', async function(req, res, next) {
  try {
    const { netid } = req.params;
    const minmax = await Datastore.getMinMaxRanks(netid);
    res.send(minmax);
  } catch (err) {
    next(err);
  } 
});


/*
 * Returns the all the genes and ranks in the given network.
 */
http.get('/:netid/genesforsearch', async function(req, res, next) {
  try {
    const { netid } = req.params;

    const cursor = await Datastore.getGenesForSearchCursor(netid);
    await writeCursorToResult(cursor, res);
    cursor.close();

  } catch (err) {
    next(err);
  } finally {
    res.end();
  }
});


/*
 * Returns the all the genes and ranks in the given network.
 */
http.get('/:netid/pathwaysforsearch', async function(req, res, next) {
  try {
    const { netid } = req.params;

    const cursor = await Datastore.getPathwaysForSearchCursor(DB_1, netid);
    await writeCursorToResult(cursor, res);
    cursor.close();

  } catch (err) {
    next(err);
  } finally {
    res.end();
  }
});


http.get('/:netid/positions', async function(req, res, next) {
  try {
    const { netid } = req.params;

    const positions = await Datastore.getPositions(netid);
    if(!positions) {
      res.sendStatus(404);
    } else {
      res.send(JSON.stringify(positions));
    }
  } catch (err) {
    next(err);
  }
});

http.post('/:netid/positions', async function(req, res, next) {
  try {
    const { netid } = req.params;
    const { positions } = req.body;

    console.log("positions");
    console.log(positions);

    if(!Array.isArray(positions)) {
      res.sendStatus(404);
      return;
    }

    await Datastore.setPositions(netid, positions);

    res.send('OK');
  } catch (err) {
    next(err);
  }
});


async function writeCursorToResult(cursor, res) {
  res.write('[');
  if(await cursor.hasNext()) {
    const obj = await cursor.next();
    res.write(JSON.stringify(obj));
  }
  while(await cursor.hasNext()) {
    res.write(',');
    const obj = await cursor.next();
    res.write(JSON.stringify(obj));
  }
  res.write(']');
}

export default http;