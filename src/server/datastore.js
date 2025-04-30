import { MongoClient } from 'mongodb';
import uuid from 'uuid';
import MUUID from 'uuid-mongodb';
import _ from 'lodash';
import { fileForEachLine } from './util.js';
import { addSeconds } from 'date-fns';

// These GMT files are loaded into collections with the same name as the file.
// export const GMT_1 = 'Human_GOBP_AllPathways_no_GO_iea_June_01_2022_symbol.gmt';
export const GMT_2 = 'Human_GOBP_AllPathways_noPFOCR_no_GO_iea_May_01_2024_symbol.gmt';

const GENE_RANKS_COLLECTION = 'geneRanks';
const GENE_LISTS_COLLECTION = 'geneLists';
const NETWORKS_COLLECTION = 'networks';
const PERFORMANCE_COLLECTION = 'performance';
const POSITIONS_COLLECTION = 'positions';
const POSITIONS_RESTORE_COLLECTION = "positionsRestore";

const DEMO_EXPIRATION_TIME = 30 * 24 * 60 * 60; // 30 days in seconds

const getExpirationDate = (t = new Date()) => addSeconds(t, DEMO_EXPIRATION_TIME);

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


/**
 * Converts a ranked gene list in TSV format into the document
 * format we want for mongo.
 */
export function rankedGeneListToDocument(rankedGeneList, delimiter = '\t') {
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
export function fgseaServiceGeneRanksToDocument(rankedGeneListObject) {
  const genes = [];
  var [min, max] = [Infinity, -Infinity];

  for(const [gene, rank] of Object.entries(rankedGeneListObject)) {
    min = Math.min(min, rank);
    max = Math.max(max, rank);
    genes.push({ gene, rank });
  }

  return { genes, min, max };
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
    console.info('Initializing MongoDB...');
    await this.loadGenesetDB(dbFilePath, dbFileName);
    console.info('Pathway Database Loaded: ' + dbFileName);
    await this.createIndexes();
    console.info('Indexes Created');
    console.info('MongoDB Intialization Done');
  }

  async dropCollectionIfExists(name) {
    const collections = await this.db.listCollections().toArray();
    console.log(`Checking if collection '${name}' exists`);
    if(collections.some(c => c.name === name)) {
      console.log(`  It does! Dropping '${name}'`);
      await this.db.collection(name).drop();
    }
  }


  /**
   * @param dbFileName Name of the GMT file. Use one of the constants at the top of this file.
   */
  async loadGenesetDB(path, dbFileName) {
    // Check if the collection already exists
    const collections = await this.db.listCollections().toArray();
    const isLoaded = collections.some(c => c.name === dbFileName);

    if (isLoaded) {
      console.info("Collection " + dbFileName + " already loaded--to reload, drop the collection first.");
    } else {
      console.info("Loading collection " + dbFileName + "...");
      // Create indexes on dbFileName collection first
      await this.db
        .collection(dbFileName)
        .createIndex({ name: 1 }, { unique: true });
      await this.db
        .collection(dbFileName)
        .createIndex({ genes: 1 });
    }

    const filepath = path + dbFileName;
    const writeOps = [];

    this.dbGeneSet = new Set();

    await fileForEachLine(filepath, line => {
      const [name, description, ...genes] = line.split("\t");
      if(genes[genes.length - 1] === "") {
        genes.pop();
      }

      if (!isLoaded) {
        writeOps.push({
          updateOne: {
            filter: { name }, // index on name already created
            update: { $set: { name, description, genes } },
            upsert: true
          }
        });
      }

      // Add all genes to the set
      for (const gene of genes) {
        this.dbGeneSet.add(gene);
      }
    });
    console.info("Loaded " + this.dbGeneSet.size + " gene symbols to the lookup set");

    // If the collection is not loaded yet, insert the documents
    if (!isLoaded) {
      await this.db
        .collection(dbFileName)
        .bulkWrite(writeOps);
    }
  }


  async createIndexes() {
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
      .collection(POSITIONS_COLLECTION)
      .createIndex({ networkID: 1 });

    await this.db
      .collection(POSITIONS_RESTORE_COLLECTION)
      .createIndex({ networkID: 1 });

    await this.db
      .collection(GENE_RANKS_COLLECTION)
      .createIndex({ networkID: 1, gene: 1 }, { unique: true });

    await this.db
      .collection(NETWORKS_COLLECTION)
      .createIndex({ demo: 1 });

    const createExpirationIndex = async (collection) => {
      await this.db
        .collection(collection)
        .createIndex(
          { expirationDate: 1 }, // only expire if this field exists in a doc
          { expireAfterSeconds: 0 }
        );
    };

    // expiry of demo networks (automatically deleted after DEMO_EXPIRATION_TIME)
    for(const collection of [
      NETWORKS_COLLECTION, // ok
      GENE_LISTS_COLLECTION, // ok
      GENE_RANKS_COLLECTION, // ok
      POSITIONS_COLLECTION, // ok
      POSITIONS_RESTORE_COLLECTION, // ok
      PERFORMANCE_COLLECTION // ok
    ]) {
      await createExpirationIndex(collection);
    }
  }


  /**
   * Inserts a network document into the 'networks' collection.
   * @returns The id of the created document.
   */
  async createNetwork(
    networkJson,
    networkName,
    type,
    geneSetCollection,
    unknownGenes,
    demo
  ) {
    if (typeof (networkJson) == 'string') {
      networkJson = JSON.parse(networkJson);
    }

    const networkID = makeID();

    networkJson['_id'] = networkID.bson;
    networkJson['networkIDStr'] = networkID.string;
    networkJson['creationTime'] = new Date();

    delete networkJson['summaryNetwork'];
    
    if(networkName)
      networkJson['networkName'] = networkName;
    if(type)
      networkJson['inputType'] = type;
    if(geneSetCollection)
      networkJson['geneSetCollection'] = geneSetCollection;
    if(unknownGenes)
      networkJson['unknownGenes'] = unknownGenes;
    if(demo)
      networkJson['demo'] = true;

    if (demo) {
      networkJson['expirationDate'] = getExpirationDate();
    }

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
  async createPerfDocument(networkIDString, document, demo) {
    if(networkIDString) {
      document = { 
        networkID: makeID(networkIDString).bson, 
        ...document
      };
    }

    if (demo) {
      document.expirationDate = getExpirationDate();
    }

    await this.db
      .collection(PERFORMANCE_COLLECTION)
      .insertOne(document);
  }


  /**
   * Inserts a ranked gene list document into the "geneLists" collection.
   * Inserts gene documents into the "geneRanks" collection.
   * @returns The id of the created document in the geneLists collection.
   */
  async initializeGeneRanks(geneSetCollection, networkIDString, rankedGeneListDocument, demo) {
    const networkID  = makeID(networkIDString);
    const geneListID = makeID();

    const { min, max, genes } = rankedGeneListDocument;

    const geneListDocument = {
      _id: geneListID.bson,
      networkID: networkID.bson,
      networkIDStr: networkID.string,
      min, max, genes
    };

    if (demo) {
      geneListDocument.expirationDate = getExpirationDate();
    }

    // Insert the gene list as a single document into GENE_LISTS_COLLECTION
    await this.db
      .collection(GENE_LISTS_COLLECTION)
      .insertOne(geneListDocument);

    // Create an initialize the documents in the GENE_RANKS_COLLECTION, used for quick lookups.
    await this.createGeneRanksDocuments(networkID, demo);
    await this.mergePathwayNamesIntoGeneRanks(geneSetCollection, networkID, demo);

    return geneListID.string;
  }

  /**
   * Creates individual documents in the gene ranks collection.
   * This must be called before the mergeXXX functions.
   */
  async createGeneRanksDocuments(networkID, demo) {
    // Create a collection with { networkID, gene } as the key, for quick lookup of gene ranks.
    await this.db
      .collection(GENE_LISTS_COLLECTION)
      .aggregate([
        { $match: { networkID: networkID.bson } },
        { $project: { _id: 0, networkID: 1, genes: 1 } },
        { $unwind: "$genes" },
        { $project: {
          networkID: 1, 
          gene: "$genes.gene",
          rank: "$genes.rank",
          ...(demo ? { expirationDate: getExpirationDate() } : {})
        } },
        { $merge: { 
            into: GENE_RANKS_COLLECTION, 
            on: [ "networkID", "gene" ] 
          }
        }
      ]).toArray();
  }


  /**
   * Update the documents in the geneRanks collection to add the 'pathways' field.
   */
  async mergePathwayNamesIntoGeneRanks(geneSetCollection, networkID, demo) {
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
            from: geneSetCollection,
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


  async getDemoNetworkIDs() {
    const ids = await this.db
      .collection(NETWORKS_COLLECTION)
      .find({ demo: true }, { projection: { _id: 0, networkIDStr: 1 } } )
      .sort({ creationTime: 1 })
      .map(obj => obj.networkIDStr)
      .toArray();

    return ids;
  }


  /**
   * Returns the network document. 
   */
  async getNetwork(networkIDString) {
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
          // projection: { network: false }
        }
      );
    
    if(!result) {
      return null;
    }
    const network = result.value;
    return network;
  }


  /**
   * {
   *   _id: 'asdf',
   *   networkID: "abcdefg",
   *   positions: [
   *     {
   *        id: "asdf-asdf-asdf",
   *        x: 12.34
   *        y: 56.78
   *        collapsed: false
   *     }
   *   ]
   * }
   * Note: Deleted nodes are not part of the positions document.
   */
  async setPositions(networkIDString, positions) {
    const networkID = makeID(networkIDString);
    const document = {
      networkID: networkID.bson,
      positions
    };

    // Check if the document is a demo
    // Must do separate query since the set positions call orginates from the client,
    // not the original create network call
    const existingDoc = (await this.db
      .collection(NETWORKS_COLLECTION)
      .findOne({ _id: networkID.bson }, { projection: { demo: 1 } }));

    const docExists = existingDoc != null;

    if (!docExists) {
      return; // don't create positions for a non-existent network
    }

    const isDemo = existingDoc.demo;

    if (isDemo) {
      document.expirationDate = getExpirationDate();
    }

    // Save the document twice, the one in POSITIONS_RESTORE_COLLECTION never changes
    await this.db
      .collection(POSITIONS_RESTORE_COLLECTION)
      .updateOne({ networkID: networkID.bson }, { $setOnInsert: document }, { upsert: true });

    await this.db
      .collection(POSITIONS_COLLECTION)
      .replaceOne({ networkID: networkID.bson }, document, { upsert: true });
  }

  async getPositions(networkIDString) {
    const networkID = makeID(networkIDString);

    let result = await this.db
      .collection(POSITIONS_COLLECTION)
      .findOne({ networkID: networkID.bson });

    if(!result) {
      console.log("Did not find positions, querying POSITIONS_RESTORE_COLLECTION");
      result = await this.db
        .collection(POSITIONS_RESTORE_COLLECTION)
        .findOne({ networkID: networkID.bson });
    }
    
    return result;  
  }

  async deletePositions(networkIDString) {
    const networkID = makeID(networkIDString);
    // Only delete from POSITIONS_COLLECTION, not from POSITIONS_RESTORE_COLLECTION
    await this.db
      .collection(POSITIONS_COLLECTION)
      .deleteOne({ networkID: networkID.bson } );
  }


  hasGene(symbol) {
    if (this.dbGeneSet === undefined) {
      console.error("dbGeneSet not initialized");
      return false;
    }
    return this.dbGeneSet.has(symbol);
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
          size: "$gs_size",
          mcode_cluster_id: true
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

  async getGeneSetCollectionUsedByNetwork(networkIDString) {
    const networkID = makeID(networkIDString);
    const network = await this.db
      .collection(NETWORKS_COLLECTION)
      .findOne(
        { _id: networkID.bson },
        { _id: 0, geneSetCollection: 1 }
      );

    return network.geneSetCollection;
  }

  /**
   * Returns an cursor of objects of the form:
   * [ { "name": "My Gene Set", "description": "blah blah", "genes": ["ABC", "DEF"] }, ... ]
   */
  async getGMTUsedByNetworkCursor(networkIDString) {
    const networkID = makeID(networkIDString);
    const geneSetCollection = await this.getGeneSetCollectionUsedByNetwork(networkIDString);

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
  async getNodeDataSetNames(networkIDString) {
    const networkID = makeID(networkIDString);

    const names = await this.db
      .collection(NETWORKS_COLLECTION)
      .aggregate([
        // Get the node data in the network
        { $match: { _id: networkID.bson } },
        { $replaceWith: { path: "$network.elements.nodes.data" } },
        { $unwind: { path: "$path" } },
        { $replaceRoot: { newRoot: "$path" } },
        // Get the names
        { $unwind: { path: "$name" } },
        { $project: { name: 1 }}
      ]) 
      .map(obj => obj.name)
      .toArray();

    return names;
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
  async getGenesWithRanks(networkIDStr, geneSetNames, intersection) {
    const networkID = makeID(networkIDStr);
    const geneSetCollection = await this.getGeneSetCollectionUsedByNetwork(networkIDStr);

    if(geneSetNames === undefined || geneSetNames.length == 0) {
      geneSetNames = await this.getNodeDataSetNames(networkID);
    }
    
    const geneListWithRanks = await this.db
        .collection(geneSetCollection)
        .aggregate([
          { $match: { name: { $in: geneSetNames } } },
          { $project: { genes: { $map: { input: "$genes", as: "g", in: { gene: "$$g" } } } } },
          { $unwind: "$genes" },
          { $replaceRoot: { newRoot: "$genes" } },
          { $group: { _id: "$gene", gene: { $first: "$gene" }, count: { $count: {} } } },
          // if intersection=true then the the gene has to be in all the given genesets
          ...(intersection 
            ? [{ $match: { $expr: { $eq: [ "$count", geneSetNames.length ] } } }]
            : []
          ),
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


  async getPathwaysForSearchCursor(networkIDStr) {
    const networkID = makeID(networkIDStr);
    const geneSetCollection = await this.getGeneSetCollectionUsedByNetwork(networkIDStr);

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
        { $project: { 
            name: true,
            pval: true,
            padj: true,
            NES: true,
            size: true,
            mcode_cluster_id: true,
            genes: { $arrayElemAt: [ "$geneSet", 0 ] },
        }},
        { $project: { 
            name: true,
            pval: true,
            padj: true,
            NES: true,
            size: true, 
            mcode_cluster_id: true,
            description: "$genes.description",
            genes: "$genes.genes"
        }},
      ]);

    return cursor;
  }


  async getNetworkCounts() {
    const result = await this.db
      .collection(NETWORKS_COLLECTION)
      .aggregate([
        { $facet: {
          'user': [
            { $match: { demo: { $ne: true } }},
            { $count: 'total' }
          ],
          'demo': [
            { $match: { demo: true }},
            { $count: 'total' }
          ],
        }},
        { $project: {
          "user": { $arrayElemAt: ["$user.total", 0] },
          "demo": { $arrayElemAt: ["$demo.total", 0] },
        }}
      ]).toArray();
    
    return result[0];
  }


  async getNetworkStatsCursor() {
    const cursor = await this.db
      .collection(NETWORKS_COLLECTION)
      .aggregate([
        { $match: { demo: { $ne: true } }},
        { $project: { 
          networkName: 1,
          creationTime: 1,
          lastAccessTime: 1,
          geneSetCollection: 1,
          inputType: 1,
          nodeCount: { $size: '$network.elements.nodes' },
          edgeCount: { $size: '$network.elements.edges' }
        }}
    ]);
    
    return cursor;
  }


}

const ds = new Datastore(); // singleton

export default ds;
