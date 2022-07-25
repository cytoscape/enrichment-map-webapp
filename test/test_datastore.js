import Datastore from '../src/server/datastore.js';
import fs from 'fs';
import { expect } from 'chai';

const GENESET_DB = 'geneset_database.gmt';

describe('Gene Set Queries', () => {

  let networkID;

  before('load genesets, load network, load ranks', async () => {
    const network = fs.readFileSync('./test/resources/network.json', { encoding: 'utf8' });
    const ranks = fs.readFileSync('./test/resources/ranks.rnk', { encoding: 'utf8' });
    await Datastore.loadGenesetDB('./test/resources/', GENESET_DB);
    networkID = await Datastore.createNetwork(network);
    await Datastore.createRankedGeneList(ranks, networkID);
  });

  it('gets a network', async () => {
    const network = await Datastore.getNetwork(networkID);
    expect(network.networkIDStr).to.eql(networkID);
    expect(network.network.elements.nodes.length).to.eql(5);
    expect(network.network.elements.edges.length).to.eql(4);
  });

  it('gets individual gene ranks', async () => {
    const geneAAA = await Datastore.getGeneRank(networkID, 'AAA');
    expect(geneAAA).to.eql({ gene: 'AAA', rank: 1.0 });
    const geneBBB = await Datastore.getGeneRank(networkID, 'BBB');
    expect(geneBBB).to.eql({ gene: 'BBB', rank: 2.0 });
  });

  it('gets a gene set', async () => {
    const geneset1 = await Datastore.getGeneSet(GENESET_DB, 'GENESET_1');
    expect(geneset1.name).to.eql('GENESET_1');
    expect(geneset1.description).to.eql('the first geneset');
    expect(geneset1.genes).to.eql(['AAA','BBB','CCC','DDD']);
    const geneset3 = await Datastore.getGeneSet(GENESET_DB, 'GENESET_3');
    expect(geneset3.name).to.eql('GENESET_3');
    expect(geneset3.description).to.eql('the third geneset');
    expect(geneset3.genes).to.eql(['AAA','BBB','CCC','GGG','HHH']);
  });

  it('gets a gene set with ranks', async () => {
    const geneset = await Datastore.getGeneSetWithRanks(GENESET_DB, 'GENESET_5', networkID);
    expect(geneset.name).to.eql('GENESET_5');
    expect(geneset.description).to.eql('the fifth geneset');
    expect(geneset.genes).to.eql([
      { gene: 'AAA', rank: 1.0 },
      { gene: 'BBB', rank: 2.0 },
      { gene: 'JJJ', rank: 10.0 },
      { gene: 'LLL', rank: 11.0 },
      { gene: 'ZZZ' }
    ]);
  });

});