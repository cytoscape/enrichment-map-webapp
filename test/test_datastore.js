import Datastore from '../src/server/datastore.js';
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
    const ranksDoc = await Datastore.rankedGeneListToDocument(ranks);
    await Datastore.initializeGeneRanks(GENESET_DB, networkID, ranksDoc);
  });

  it('gets a network', async () => {
    const network = await Datastore.getNetwork(networkID, { nodeLimit: 100 });
    expect(network.networkIDStr).to.eql(networkID);
    expect(network.summaryNetwork.elements.nodes.length).to.eql(4);
    expect(network.summaryNetwork.elements.edges.length).to.eql(2);
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
    const results = await Datastore.getGenesWithRanks(GENESET_DB, networkID, ['GENESET_5'], { nodeLimit: 100 });
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
    const results = await Datastore.getGenesWithRanks(GENESET_DB, networkID, ['GENESET_3', 'GENESET_4'], { nodeLimit: 100 });
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
    const results = await Datastore.getGenesWithRanks(GENESET_DB, networkID, [], { nodeLimit: 100 });
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

  it('gets nodes for genes', async () => { 
    const lookup = async gene => {
      const results = await Datastore.getNodesContainingGene(networkID, gene);
      results.nodeIDs.sort();
      return results;
    };
    {  
      const results = await lookup("AAA");
      expect(results).to.eql({
        nodeIDs: [
          '3f9549bd-17f3-4625-88da-86f33794aac5',
          '9aaa7dea-8353-4cb6-9e8b-dd0b52927821',
          'aae5d32b-04ac-4aa7-a440-81843921e258',
          'ccc53527-c85f-411d-8b96-bd317522b6a7',
        ]
      });
    } {
      const results = await lookup("CCC");
      expect(results).to.eql({
        nodeIDs: [
          '9aaa7dea-8353-4cb6-9e8b-dd0b52927821',
          'ccc53527-c85f-411d-8b96-bd317522b6a7',
        ]
      });
    } {
      const results = await lookup("LLL");
      expect(results).to.eql({
        nodeIDs: [
          'aae5d32b-04ac-4aa7-a440-81843921e258',
        ]
      });
    } 
  });
});