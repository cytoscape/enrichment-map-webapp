import fs from 'fs/promises';
import { runDataPipeline } from './routes/api/create.js';
import Datastore from './datastore.js';


const exprFile = './public/geneset-db/GSE129943_rsem_counts_HGNC_expr.txt';


export async function loadDemoNetwork() {
  const id = await Datastore.getDemoNetworkID();
  if(id) {
    console.log("Demo network already loaded");
    Datastore.setDemoNetworkID(id);
    return;
  }

  console.log("Loading demo network");
  let data;
  try {
    data = await fs.readFile(exprFile, 'utf8');
  } catch(e) {
    console.error(e);
    return;
  }

  const params = {
    demo: true,
    networkName: 'Demo Network',
    contentType: 'text/tab-separated-values',
    type: 'rnaseq',
    classes: 'X,A,A,A,B,B,B',
    body: data
  };

  const networkID = await runDataPipeline(params);

  console.log("Demo network loaded");
  Datastore.setDemoNetworkID(networkID);
}