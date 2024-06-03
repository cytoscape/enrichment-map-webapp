import Datastore from '../src/server/datastore.js';
import { rankedGeneListToDocument } from '../src/server/datastore.js';
import fs from 'fs';
import { expect } from 'chai';

const GENESET_DB = 'geneset_database.gmt';

describe('Gene Set Queries', () => {

  let networkID;

  before('load genesets, load network, load ranks', async () => {
    const networkStr = fs.readFileSync('./test/resources/network.json', { encoding: 'utf8' });
    const network = JSON.parse(networkStr);

    const ranks = fs.readFileSync('./test/resources/ranks.rnk', { encoding: 'utf8' });

    await Datastore.dropCollectionIfExists(GENESET_DB);
    await Datastore.initializeGeneSetDB('./test/resources/', GENESET_DB);

    networkID = await Datastore.createNetwork(network);
    const ranksDoc = await rankedGeneListToDocument(ranks);
    await Datastore.initializeGeneRanks(GENESET_DB, networkID, ranksDoc);
  });

  it('gets a network', async () => {
    const network = await Datastore.getNetwork(networkID, { nodeLimit: 100 });
    expect(network.networkIDStr).to.eql(networkID);
  });

  it('get a gene sets', async () => {
    const results = await Datastore.getGeneSets(GENESET_DB, ['GENESET_1', 'GENESET_2']);
    expect(results).to.eql([
      { name: "GENESET_1",
        description: "the first geneset",
        genes: ["AAA","BBB","CCC","DDD"]
      },
      { name:"GENESET_2",
        description:"the second geneset",
        genes: ["AAA","BBB","CCC","DDD","EEE","FFF"]
      }
    ]);
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

  it('gets geneset with ranks intersection', async () => {
    const results = await Datastore.getGenesWithRanks(GENESET_DB, networkID, ['GENESET_3', 'GENESET_4'], true);
    expect(results).to.eql({
      minRank: 1,
      maxRank: 11,
      genes: [
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

  it('gets the ranked gene list', async () => {
    const results = await Datastore.getRankedGeneList(networkID);
    expect(results).to.eql({ 
      min: 1,
      max: 11,
      genes: [
        { gene: "AAA", rank: 1 },
        { gene: "BBB", rank: 2 },
        { gene: "CCC", rank: 3 },
        { gene: "DDD", rank: 4 },
        { gene: "EEE", rank: 5 },
        { gene: "FFF", rank: 6 },
        { gene: "GGG", rank: 7 },
        { gene: "HHH", rank: 8 },
        { gene: "III", rank: 9 },
        { gene: "JJJ", rank: 10 },
        { gene: "LLL", rank: 11 }
      ]
    });
  });

});