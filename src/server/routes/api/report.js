import Express from 'express';
import Datastore from '../../datastore.js';
import { writeCursorToResult } from './index.js';

const http = Express.Router();

// Return enrichment results in TSV format
http.get('/count', async function(req, res, next) {
  try {
    const counts = await Datastore.getNetworkCounts();
    res.send(JSON.stringify(counts));

  } catch(err) {
    next(err);
  }
});

// Return enrichment results in TSV format
http.get('/networks', async function(req, res, next) {
  try {
    const cursor = await Datastore.getNetworkStatsCursor();
    await writeCursorToResult(cursor, res);
    cursor.close();

  } catch(err) {
    next(err);
  } finally {
    res.end();
  }
});

export default http;