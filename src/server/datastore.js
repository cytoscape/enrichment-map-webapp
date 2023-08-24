import { MongoClient } from 'mongodb';
import uuid from 'uuid';
import MUUID from 'uuid-mongodb';
import _ from 'lodash';
import { fileForEachLine } from './util.js';


export const DB_1 = 'Human_GOBP_AllPathways_no_GO_iea_June_01_2022_symbol.gmt';

const GENE_RANKS_COLLECTION = 'geneRanks';
const GENE_LISTS_COLLECTION = 'geneLists';
const NETWORKS_COLLECTION = 'networks';
const PERFORMANCE_COLLECTION = 'performance';

/**
 * When called with no args will returns a new unique mongo ID.
 * When called with a UUID string arg will convert it to a mongo compatible ID.
 * Throws an exception if called with an invalid string arg.
 */
function makeID(strOrObj) {
  if(_.has(strOrObj, 'bson')) {
    return strOrObj;
  }
  const string = _.isString(strOrObj) ? strOrObj : uuid.v4();
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

    // TODO is this index (into an array) still necessary??
    await this.db
      .collection(GENE_LISTS_COLLECTION)
      .createIndex({ 'genes.gene': 1 });

    await this.db
      .collection(GENE_RANKS_COLLECTION)
      .createIndex({ networkID: 1 });

    await this.db
      .collection(GENE_RANKS_COLLECTION)
      .createIndex({ networkID: 1, gene: 1 }, { unique: true });
  }


  /**
   * Inserts a network document into the 'networks' collection.
   * @returns The id of the created document.
   */
  async createNetwork(networkJson, networkName, type, geneSetCollection) {
    if (typeof (networkJson) == 'string') {
      networkJson = JSON.parse(networkJson);
    }

    const networkID = makeID();

    networkJson['_id'] = networkID.bson;
    networkJson['networkIDStr'] = networkID.string;
    networkJson['creationTime'] = new Date();
    
    if(networkName)
      networkJson['networkName'] = networkName;
    if(type)
      networkJson['inputType'] = type;
    if(geneSetCollection)
      networkJson['geneSetCollection'] = geneSetCollection;

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
    
    const res = await this.db
      .collection(NETWORKS_COLLECTION)
      .updateOne(
        { '_id': networkID.bson }, 
        { $set: { networkName: networkName } }
      );

    return res.modifiedCount > 0;
  }

  /**
   * Inserts the given document into the 'performance' collection.
   */
  async createPerfDocument(networkIDString, document) {
    if(networkIDString) {
      document = { 
        networkID: makeID(networkIDString).bson, 
        ...document
      };
    }
    await this.db
      .collection(PERFORMANCE_COLLECTION)
      .insertOne(document);
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
  async initializeGeneRanks(geneSetCollection, networkIDString, rankedGeneListDocument) {
    const networkID  = makeID(networkIDString);
    const geneListID = makeID();

    const { min, max, genes } = rankedGeneListDocument;

    const geneListDocument = {
      _id: geneListID.bson,
      networkID: networkID.bson,
      networkIDStr: networkID.string,
      min, max, genes
    };

    // Insert the gene list as a single document into GENE_LISTS_COLLECTION
    await this.db
      .collection(GENE_LISTS_COLLECTION)
      .insertOne(geneListDocument);

    // Create an initialize the documents in the GENE_RANKS_COLLECTION, used for quick lookups.
    await this.createGeneRanksDocuments(networkID);
    await this.mergeSummaryNodeIDsIntoGeneRanks(geneSetCollection, networkID);
    await this.mergePathwayNamesIntoGeneRanks(geneSetCollection, networkID);

    return geneListID.string;
  }

  /**
   * Creates individual documents in the gene ranks collection.
   * This must be called before the mergeXXX functions.
   */
  async createGeneRanksDocuments(networkID) {
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
      ]).toArray();
  }


  /**
   * Update the documents in the geneRanks collection to add the 'summaryNodeIDs' field.
   */
  async mergeSummaryNodeIDsIntoGeneRanks(geneSetCollection, networkID) {
    await this.db
      .collection(NETWORKS_COLLECTION)
      .aggregate([
        // Get the nodeIDs and the names of the Pathways they represent
        { $match: { _id: networkID.bson } },
        { $replaceWith: { path: "$summaryNetwork.elements.nodes.data" } },
        { $unwind: { path: "$path" } },
        { $replaceRoot: { newRoot: "$path" } },
        { $addFields: { splitNames: { 
            $cond: {
              if: { $isArray: "$name" },
              then: { $getField: "name" },
              else: { $split: [ "$name", "," ] }
            }
        } } },
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
            whenMatched: [{ $addFields: { summaryNodeIDs: "$$nodeIDs" } }],
          }
        }
      ]).toArray(); 
  }

  /**
   * Update the documents in the geneRanks collection to add the 'pathways' field.
   */
  async mergePathwayNamesIntoGeneRanks(geneSetCollection, networkID) {
    await this.db
      .collection(NETWORKS_COLLECTION)
      .aggregate([
        // Get the nodeIDs and the names of the Pathways they represent
        { $match: { _id: networkID.bson } },
        { $replaceWith: { path: "$network.elements.nodes.data" } },
        { $unwind: { path: "$path" } },
        { $replaceRoot: { newRoot: "$path" } },
        { $addFields: { splitNames: { 
            $cond: {
              if: { $isArray: "$name" },
              then: { $getField: "name" },
              else: { $split: [ "$name", "," ] }
            }
        } } },
        { $unwind: { path: "$splitNames" } },
      
        // Lookup the genes contained in each node
        { $lookup: {
            from: DB_1,
            localField: "splitNames",
            foreignField: "name",
            as: "geneSet"
        }},
        { $replaceRoot: { newRoot: { $mergeObjects: [ { $arrayElemAt: [ "$geneSet", 0 ] }, "$$ROOT" ] } } },
        { $project: { name: 1, genes: 1 } },
        { $unwind: { path: "$genes" } },
        { $project: { genes: 1, name: { $arrayElemAt: [ "$name", 0 ] } } },
        { $group: { _id: "$genes", names: { $addToSet: "$name" } }},
        { $project: { _id: 0, gene: "$_id", names: 1, networkID: networkID.bson } },
      
        // Update the geneRanks collection
        { $merge: {
            into: GENE_RANKS_COLLECTION,
            on: [ "networkID", "gene" ],
            whenNotMatched: "discard",
            let: { names: "$names" },
            whenMatched: [{ $addFields: { pathwayNames: "$$names" } }],
          }
        }
      ]).toArray();
  }

  /**
   * Returns the network document. 
   */
  async getNetwork(networkIDString, options) {
    const { nodeLimit } = options;

    let networkID;
    try {
      networkID = makeID(networkIDString);
    } catch {
      console.log(`Invalid network ID: '${networkIDString}'`);
      return null;
    }

    const result = await this.db
      .collection(NETWORKS_COLLECTION)
      .findOneAndUpdate(
        { _id: networkID.bson },
        { $set: { lastAccessTime: new Date() } },
        { returnDocument: 'after',
          projection: { network: false }
        }
      );
    
    if(!result) {
      return null;
    }
    const network = result.value;

    if(nodeLimit) {
      this.limitNodesByNES(network.summaryNetwork, nodeLimit);
    }
    return network;
  }


  /**
   * Returns the aggregation pipeline stages needed to extract 
   * the FGSEA enrichment results from the NETWORKS_COLLECTION. 
   * 
   * The results are of the form...
   * 
   * {
   *  "padj": 0,
   *  "NES": -1.8082,
   *  "name": "MITOTIC METAPHASE AND ANAPHASE%REACTOME%R-HSA-2555396.2",
   *  "pval": 5.6229e-7,
   *  "size": 229
   * }
   */
  _enrichmentQuery(networkID) {
    return [
      { $match: { _id: networkID.bson } },
      { $replaceWith: { path: "$network.elements.nodes.data" } },
      { $unwind: { path: "$path" } },
      { $replaceRoot: { newRoot: "$path" } },
      { $project: { 
          name: { $arrayElemAt: [ "$name", 0 ] },
          pval: "$pvalue",
          padj: true,
          NES: true,
          size: "$gs_size"
      }}
    ];
  }

  /**
   * Returns an cursor of renrichment results objects.
   */
  async getEnrichmentResultsCursor(networkIDString) {
    const networkID = makeID(networkIDString);

    const cursor = await this.db
      .collection(NETWORKS_COLLECTION)
      .aggregate(this._enrichmentQuery(networkID));

    return cursor;
  }

  /**
   * Returns an cursor of objects of the form (sorted by rank):
   * [ { "gene": "ABCD", "rank": 0.0322 }, ... ]
   */
  async getRankedGeneListCursor(networkIDString) {
    const networkID = makeID(networkIDString);

    const cursor = await this.db
      .collection(GENE_LISTS_COLLECTION)
      .aggregate([
        { $match: { networkID: networkID.bson } },
        { $unwind: { path: "$genes" } },
        { $replaceRoot: { newRoot: "$genes" } },
        { $sort: { rank: -1 }}
      ]);

    return cursor;
  }

  /**
   * Returns an cursor of objects of the form:
   * [ { "name": "My Gene Set", "description": "blah blah", "genes": ["ABC", "DEF"] }, ... ]
   */
  async getGMTCursor(geneSetCollection, networkIDString) {
    const networkID = makeID(networkIDString);

    const cursor = await this.db
      .collection(NETWORKS_COLLECTION)
      .aggregate([
        ...this._enrichmentQuery(networkID),
        { $lookup: {
            from: geneSetCollection,
            localField: "name",
            foreignField: "name",
            as: "geneSet"
        }},
        { $unwind: "$geneSet" },
        { $project: { 
            name: true,
            description: "$geneSet.description",
            genes: "$geneSet.genes",
        }}
      ]);
    
    return cursor;
  }


  /**
   * Returns names 
   */
  async getNodeDataSetNames(networkIDString, options) {
    const { nodeLimit } = options;
    const networkID = makeID(networkIDString);

    const names = await this.db
      .collection(NETWORKS_COLLECTION)
      .aggregate([
        // Get the node data in the network
        { $match: { _id: networkID.bson } },
        { $replaceWith: { path: "$summaryNetwork.elements.nodes.data" } },
        { $unwind: { path: "$path" } },
        { $replaceRoot: { newRoot: "$path" } },
      
        // Limit to top 50 by NES magnitude
        { $addFields: { magNES: { $abs: "$NES" } } },
        { $sort: { magNES: -1 } },
        { $limit: nodeLimit },
      
        // Get the names
        { $unwind: { path: "$name" } },
        { $project: { name: 1 }}
      ]) 
      .map(obj => obj.name)
      .toArray();

    return names;
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
        { projection: { _id: 0, nodeIDs: "$summaryNodeIDs" } }
      );
  }

  /**
   * Returns the values of the min and max ranks in the network.
   */
  async getMinMaxRanks(networkIDStr) {
    const networkID = makeID(networkIDStr);

    const minMax = await this.db
      .collection(GENE_LISTS_COLLECTION)
      .findOne(
        { networkID: networkID.bson },
        { projection: { min: 1, max: 1 } }
      );

    return {
      minRank: minMax.min,
      maxRank: minMax.max,
    };
  }

  /**
   * Returns the genes from one or more given gene sets joined with ranks.
   * The returned array is sorted so that the genes with ranks are first (sorted by rank),
   * then the genes without rankes are after (sorted alphabetically).
   */
  async getGenesWithRanks(geneSetCollection, networkIDStr, geneSetNames, options) {
    const { nodeLimit } = options;
    const networkID = makeID(networkIDStr);

    if(geneSetNames === undefined || geneSetNames.length == 0) {
      geneSetNames = await this.getNodeDataSetNames(networkID, { nodeLimit });
    }
    
    const geneListWithRanks = await this.db
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

    const { minRank, maxRank } = await this.getMinMaxRanks(networkID);

    return {
      minRank,
      maxRank,
      genes: geneListWithRanks
    };
  }


  async getGenesForSearchCursor(networkIDStr) {
    const networkID = makeID(networkIDStr);

    const cursor = await this.db
      .collection(GENE_RANKS_COLLECTION)
      .find(
        { networkID: networkID.bson }, 
        { projection: { _id: 0, gene: 1, rank: 1, pathwayNames: 1 } }
      );
    
    return cursor;
  }


  async getPathwaysForSearchCursor(geneSetCollection, networkIDStr) {
    const networkID = makeID(networkIDStr);

    const cursor = await this.db
      .collection(NETWORKS_COLLECTION)
      .aggregate([
        ...this._enrichmentQuery(networkID),
        { $lookup: {
            from: geneSetCollection,
            localField: "name",
            foreignField: "name",
            as: "geneSet"
        }}
      ]);

    return cursor;
  }

}

const ds = new Datastore(); // singleton

export default ds;
