import { MongoClient } from 'mongodb';
import uuid from 'uuid';
import MUUID from 'uuid-mongodb';
import { fileForEachLine } from './util.js';


export const DB_1 = 'Human_GOBP_AllPathways_no_GO_iea_June_01_2022_symbol.gmt';

const GENE_RANKS_COLLECTION = 'geneRanks';
const GENE_LISTS_COLLECTION = 'geneLists';
const NETWORKS_COLLECTION = 'networks';


function makeID(string) {
  if (!string) {
    string = uuid.v4();
  }
  const bson = MUUID.from(string);
  return { string, bson };
}

class Datastore {
  // mongo; // mongo connection obj
  // db; // app db
  // queries; // queries collection (i.e. query results)

  constructor() { }

  async connect() {
    console.info('Connecting to MongoDB');
    const { MONGO_URL, MONGO_ROOT_NAME, MONGO_COLLECTION_QUERIES } = process.env;

    const mongo = this.mongo = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = this.db = mongo.db(MONGO_ROOT_NAME);
    this.queries = db.collection(MONGO_COLLECTION_QUERIES);
    console.info('Connected to MongoDB');
  }

  async initializeGeneSetDB(dbFilePath, dbFileName) {
    console.info('Loading gene set databases into MongoDB');
    // await this.loadGenesetDB('./public/geneset-db/', DB_1);
    await this.loadGenesetDB(dbFilePath, dbFileName);
    console.info('Loading done');
    await this.createGeneListIndexes();
    console.info('Mongo initialized');
  }

  async dropCollectionIfExists(name) {
    const collections = await this.db.listCollections().toArray();
    console.log(`Checking if collection '${name}' exists`);
    if(collections.some(c => c.name === name)) {
      console.log(`  It does! Dropping '${name}'`);
      await this.db.collection(name).drop();
    }
  }


  async loadGenesetDB(path, dbFileName) {
    const collections = await this.db.listCollections().toArray();
    if(collections.some(c => c.name === dbFileName)) {
      console.info("Collection " + dbFileName + " already loaded");
      return;
    } else {
      console.info("Loading collection " + dbFileName);
    }

    const filepath = path + dbFileName;
    const geneSets = [];

    await fileForEachLine(filepath, line => {
      const [name, description, ...genes] = line.split("\t");
      if(genes[genes.length - 1] === "") {
        genes.pop();
      }
      geneSets.push({ name, description, genes });
    });

    await this.db
      .collection(dbFileName)
      .insertMany(geneSets);

    // Create indexes on dbFileName collection
    await this.db
      .collection(dbFileName)
      .createIndex({ name: 1 });

    await this.db
      .collection(dbFileName)
      .createIndex({ genes: 1 });
  }


  async createGeneListIndexes() {
    await this.db
      .collection(GENE_LISTS_COLLECTION)
      .createIndex({ networkID: 1 });

    await this.db
      .collection(GENE_LISTS_COLLECTION)
      .createIndex({ 'genes.gene': 1 });

    await this.db
      .collection(GENE_RANKS_COLLECTION)
      .createIndex({ networkID: 1, gene: 1 }, { unique: true });
  }


  /**
   * Inserts a network document into the 'networks' collection.
   * @returns The id of the created document.
   */
  async createNetwork(networkJson, networkName) {
    if (typeof (networkJson) == 'string') {
      networkJson = JSON.parse(networkJson);
    }

    const networkID = makeID();

    networkJson['_id'] = networkID.bson;
    networkJson['networkIDStr'] = networkID.string;
    networkJson['creationTime'] = new Date();
    
    if(networkName)
      networkJson['networkName'] = networkName;

    await this.db
      .collection(NETWORKS_COLLECTION)
      .insertOne(networkJson);

    return networkID.string;
  }
  
  /**
   * Updates a network document--only the 'networkName' can be updated.
   * @returns true if the network has been found and updated, false otherwise.
   */
  async updateNetwork(networkIDString, { networkName }) {
    const networkID = makeID(networkIDString);
    const filter = { '_id': networkID.bson };
    const updateDoc = { $set: { networkName: networkName } };
    
    const res = await this.db
      .collection(NETWORKS_COLLECTION)
      .updateOne(filter, updateDoc);

    return res.modifiedCount > 0;
  }


  /**
   * Converts a ranked gene list in TSV format into the document
   * format we want for mongo.
   */
  rankedGeneListToDocument(rankedGeneList, delimiter = '\t') {
    const genes = [];
    var [min, max] = [Infinity, -Infinity];

    rankedGeneList.split("\n").slice(1).forEach(line => {
      const [gene, rankStr] = line.split(delimiter);

      const rank = Number(rankStr);

      if (gene) {
        if (isNaN(rank)) {
          genes.push({ gene });
        } else {
          min = Math.min(min, rank);
          max = Math.max(max, rank);
          genes.push({ gene, rank });
        }
      }
    });

    return { genes, min, max };
  }


  /**
   * Converts a JSON object in the format { "GENENAME1": rank1, "GENENAME2": rank2, ... }
   * into the document format we want for mongo.
   */
  fgseaServiceGeneRanksToDocument(rankedGeneListObject) {
    const genes = [];
    var [min, max] = [Infinity, -Infinity];

    for(const [gene, rank] of Object.entries(rankedGeneListObject)) {
      min = Math.min(min, rank);
      max = Math.max(max, rank);
      genes.push({ gene, rank });
    }

    return { genes, min, max };
  }


  /**
   * Inserts a ranked gene list document into the "geneLists" collection.
   * Inserts gene documents into the "geneRanks" collection.
   * @returns The id of the created document in the geneLists collection.
   */
  async createRankedGeneList(geneSetCollection, networkIDString, rankedGeneListDocument) {
    const networkID  = makeID(networkIDString);
    const geneListID = makeID();

    const { min, max, genes } = rankedGeneListDocument;

    const geneListDocument = {
      _id: geneListID.bson,
      networkID: networkID.bson,
      networkIDStr: networkID.string,
      min,
      max,
      genes
    };

    // Insert the gene list as a single document into GENE_LISTS_COLLECTION
    await this.db
      .collection(GENE_LISTS_COLLECTION)
      .insertOne(geneListDocument);

    // Create a collection with { networkID, gene } as the key, for quick lookup of gene ranks.
    await this.db
      .collection(GENE_LISTS_COLLECTION)
      .aggregate([
        { $match: { networkID: networkID.bson } },
        { $project: { _id: 0, networkID: 1, genes: 1 } },
        { $unwind: "$genes" },
        { $project: { networkID: 1, gene: "$genes.gene", rank: "$genes.rank" } },
        { $merge: { 
            into: GENE_RANKS_COLLECTION, 
            on: [ "networkID", "gene" ] 
          }
        }
      ])
      .toArray(); // Still need toArray() even though this is a merge

    // Update the documents in the geneRanks collection to add a mapping from 
    // { networkID, gene } to a list of node IDs that contain that gene.
    await this.db
      .collection(NETWORKS_COLLECTION)
      .aggregate([
        // Get the nodeIDs and the names of the Pathways they represent
        { $match: { _id: networkID.bson } },
        { $replaceWith: { path: "$summaryNetwork.elements.nodes.data" } },
        { $unwind: { path: "$path" } },
        { $replaceRoot: { newRoot: "$path" } },
        { $addFields: { splitNames: { $split: [ "$name", "," ] } } },
        { $unwind: { path: "$splitNames" } },
      
        // Lookup the genes contained in each node
        { $lookup: {
            from: geneSetCollection,
            localField: "splitNames",
            foreignField: "name",
            as: "geneSet"
        }},
        { $replaceRoot: { newRoot: { $mergeObjects: [ { $arrayElemAt: [ "$geneSet", 0 ] }, "$$ROOT" ] } } },
        { $unwind: { path: "$genes" } },
        { $group: { _id: "$genes", nodeIDs: { $addToSet: "$id" } }},
        { $project: { _id: 0, gene: "$_id", nodeIDs: 1, networkID: networkID.bson } },
      
        // Update the geneRanks collection
        { $merge: {
            into: GENE_RANKS_COLLECTION,
            on: [ "networkID", "gene" ],
            whenNotMatched: "discard",
            let: { nodeIDs: "$nodeIDs" },
            whenMatched: [{ $addFields: { nodeIDs: "$$nodeIDs" } }],
          }
        }
      ])
      .toArray();

    console.log("done loading gene ranks");
    return geneListID.string;
  }

  /**
   * Returns the entire network document. 
   */
  async getNetwork(networkIDString, options) {
    const { nodeLimit, full } = options;

    const networkID = makeID(networkIDString);
    const network = await this.db
      .collection(NETWORKS_COLLECTION)
      .findOne(
        { _id: networkID.bson },
        full ? { projection: { summaryNetwork: false } } 
             : { projection: { network: false } }
      );
    
    if(!network) {
      return null;
    }

    if(nodeLimit) {
      this.limitNodesByNES(full ? network.network : network.summaryNetwork, nodeLimit);
    }

    return network;
  }

  limitNodesByNES(network, nodeLimit) {
    const { elements } = network;
    // Take top nodes sorted by NES magnitude
    elements.nodes.sort((a, b) => Math.abs(b.data.NES) - Math.abs(a.data.NES));
    elements.nodes = elements.nodes.slice(0, nodeLimit);
    const nodeIDs = new Set(elements.nodes.map(n => n.data.id));
    elements.edges = elements.edges.filter(e => nodeIDs.has(e.data.source) && nodeIDs.has(e.data.target));
  }


  /**
   * Returns the entire gene/ranks document. 
   */
   async getRankedGeneList(networkIDString) {
    const networkID = makeID(networkIDString);
    const network = await this.db
      .collection(GENE_LISTS_COLLECTION)
      .findOne(
        { networkID: networkID.bson },
        { projection: { _id: 0, min: 1, max: 1, genes: 1 } }
      );

    return network;
  }


  /**
   * Returns the contents of a gene set, including the name,
   * description and gene list.
   */
  async getGeneSets(geneSetCollection, geneSetNames) {
    return await this.db
      .collection(geneSetCollection)
      .find({ name: { $in: geneSetNames } })
      .project({ _id: 0 })
      .toArray();
  }


  /**
   * Returns the IDs of nodes that contain the given gene.
   */
  async getNodesContainingGene(networkIDString, geneName) {
    const networkID = makeID(networkIDString);
    return await this.db
      .collection(GENE_RANKS_COLLECTION)
      .findOne(
        { networkID: networkID.bson, gene: geneName },
        { projection: { _id: 0, nodeIDs: 1 } }
      );
  }


  /**
   * Returns the genes from one or more gene sets joined with ranks.
   * The returned array is sorted so that the genes with ranks are first (sorted by rank),
   * then the genes without rankes are after (sorted alphabetically).
   */
  async getGenesWithRanks(geneSetCollection, networkIDStr, geneSetNames) {
    const all = geneSetNames === undefined || geneSetNames.length == 0;
    const networkID = makeID(networkIDStr);

    const minMax = await this.db
      .collection(GENE_LISTS_COLLECTION)
      .findOne(
        { networkID: networkID.bson },
        { projection: { min: 1, max: 1 } } // 'projection:' is explicit because min,max have special meaning in mongo
      );

    let geneListWithRanks;
    if (all) {
      geneListWithRanks = await this.db
        .collection(GENE_LISTS_COLLECTION)
        .aggregate([
          { $match: { networkID: networkID.bson } },
          { $unwind: "$genes" },
          { $replaceRoot: { newRoot: "$genes" } },
          { $sort: { rank: -1, gene: 1 } }
        ])
        .toArray();

    } else {
      geneListWithRanks = await this.db
        .collection(geneSetCollection)
        .aggregate([
          { $match: { name: { $in: geneSetNames } } },
          { $project: { genes: { $map: { input: "$genes", as: "g", in: { gene: "$$g" } } } } },
          { $unwind: "$genes" },
          { $replaceRoot: { newRoot: "$genes" } },
          { $group: { _id: "$gene", gene: { $first: "$gene" } } },
          { $lookup: {
              from: GENE_RANKS_COLLECTION,
              let: { gene: "$gene" },
              pipeline: [
                { $match: 
                  { $expr: 
                    { $and: [ 
                      { $eq: [ '$networkID', networkID.bson ] }, 
                      { $eq: [ '$gene', '$$gene' ] } ] 
                    }
                  }
                }
              ],
              as: "newField"
            }
          },
          { $project: { _id: 0, gene: "$gene", rank: { $first: "$newField.rank" } } },
          { $match: { rank: { $exists: true } } },
          { $sort: { rank: -1, gene: 1 } }
        ])
        .toArray();
    }

    return {
      minRank: minMax.min,
      maxRank: minMax.max,
      genes: geneListWithRanks
    };
  }


  async searchGenes(geneSetCollection, networkIDStr, geneTokens) {
    if(geneTokens === undefined || geneTokens.length === 0)
      return { genes: [] };

    const networkID = makeID(networkIDStr);
    const queryRE = new RegExp(geneTokens.join('|'));

    const minMax = await this.db
      .collection(GENE_LISTS_COLLECTION)
      .findOne(
        { networkID: networkID.bson },
        { projection: { min: 1, max: 1 } } // 'projection:' is explicit because min,max have special meaning in mongo
      );

    const geneListWithRanksAndGeneSets = await this.db
      .collection(geneSetCollection)
      .aggregate([
        { $match: { genes: queryRE } },
        { $unwind: '$genes' },
        { $match: { genes: queryRE } },
        { $limit: 100 },
        { $group: { _id: { gene: '$genes' }, geneSets: { $addToSet: '$name' } } },
        { $project: { _id: 0, gene: '$_id.gene', geneSets: 1 }},
        { $lookup: {
            from: GENE_RANKS_COLLECTION,
            let: { gene: "$gene" },
            pipeline: [
              { $match: 
                { $expr: 
                  { $and: [ 
                    { $eq: [ '$networkID', networkID.bson ] }, 
                    { $eq: [ '$gene', '$$gene' ] } ] 
                  }
                }
              }
            ],
            as: "newField"
          }
        },
        { $project: { _id: 0, gene: 1, geneSets: 1, rank: { $first: "$newField.rank" } } },
        { $sort: { rank: -1, gene: 1 } }
      ])
      .toArray();

    return {
      minRank: minMax.min,
      maxRank: minMax.max,
      genes: geneListWithRanksAndGeneSets
    };
  }
}

const ds = new Datastore(); // singleton

export default ds;
