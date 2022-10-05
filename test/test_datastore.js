import Datastore from '../src/server/datastore.js';
import fs from 'fs';
import { expect } from 'chai';

const GENESET_DB = 'geneset_database.gmt';

describe('Gene Set Queries', () => {

  let networkID;

  before('load genesets, load network, load ranks', async () => {
    const network = fs.readFileSync('./test/resources/network.json', { encoding: 'utf8' });
    const ranks = fs.readFileSync('./test/resources/ranks.rnk', { encoding: 'utf8' });
    await Datastore.dropCollectionIfExists(GENESET_DB);
    await Datastore.initializeGeneSetDB('./test/resources/', GENESET_DB);
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

  it('gets a geneset with ranks', async () => {
    const results = await Datastore.getGenesWithRanks(GENESET_DB, networkID, ['GENESET_5']);
    expect(results).to.eql({
      minRank: 1,
      maxRank: 11,
      genes: [
        { gene: "LLL", rank: 11 },
        { gene: "JJJ", rank: 10 },
        { gene: "BBB", rank: 2 },
        { gene: "AAA", rank: 1 },
        { gene: "ADF" },
        { gene: "ZZZ" }
      ]
    });
  });

  it('gets more than one geneset with ranks', async () => {
    const results = await Datastore.getGenesWithRanks(GENESET_DB, networkID, ['GENESET_3', 'GENESET_4']);
    expect(results).to.eql({
      minRank: 1,
      maxRank: 11,
      genes: [
        { gene: "III", rank: 9 },
        { gene: "HHH", rank: 8 },
        { gene: "GGG", rank: 7 },
        { gene: "CCC", rank: 3 },
        { gene: "BBB", rank: 2 },
        { gene: "AAA", rank: 1 }
      ]
    });
  });

  it('gets all genesets with ranks', async () => {
    const results = await Datastore.getGenesWithRanks(GENESET_DB, networkID, []);
    expect(results).to.eql({
      minRank: 1,
      maxRank: 11,
      genes: [
        { gene: "LLL", rank: 11 },
        { gene: "JJJ", rank: 10 },
        { gene: "III", rank: 9 },
        { gene: "HHH", rank: 8 },
        { gene: "GGG", rank: 7 },
        { gene: "FFF", rank: 6 },
        { gene: "EEE", rank: 5 },
        { gene: "DDD", rank: 4 },
        { gene: "CCC", rank: 3 },
        { gene: "BBB", rank: 2 },
        { gene: "AAA", rank: 1 }
      ]
    });
  });

  it('searches for genes', async () => {
    const results = await Datastore.searchGenes(GENESET_DB, networkID, ['D']);
    results.genes.forEach(g => g.geneSets.sort());
    expect(results).to.eql({
      minRank: 1,
      maxRank: 11,
      genes: [
        { gene: "DDD", rank: 4, geneSets: ['GENESET_1','GENESET_2'] },
        { gene: "ADF", geneSets: ['GENESET_5' ] },
      ]
    });
  });

});