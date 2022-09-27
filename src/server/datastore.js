import e from 'express';
import { MongoClient } from 'mongodb';
import uuid from 'uuid';
import MUUID from 'uuid-mongodb';
import { fileForEachLine } from './util.js';


export const DB_1 = 'Human_GOBP_AllPathways_no_GO_iea_June_01_2022_symbol.gmt';

const GENE_LISTS_COLLECTION = 'geneLists';
const NETWORKS_COLLECTION = 'networks';


function makeID(string) {
    if(!string) {
        string = uuid.v4();
    }
    const bson = MUUID.from(string);
    return { string, bson };
}


// TODO reformat this file, should be using two spaces for indentation

class Datastore {
    // mongo; // mongo connection obj
    // db; // app db
    // queries; // queries collection (i.e. query results)

    constructor() {
    }

    async connect() {
        console.info('Connecting to MongoDB');
        const { MONGO_URL, MONGO_ROOT_NAME, MONGO_COLLECTION_QUERIES } = process.env;

        const mongo = this.mongo = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = this.db = mongo.db(MONGO_ROOT_NAME);
        const queries = this.queries = db.collection(MONGO_COLLECTION_QUERIES);
        console.info('Connected to MongoDB');

        console.info('Loading gene set databases into MongoDB');
        await this.loadGenesetDB('./public/geneset-db/', DB_1);
        console.info('Loading done');
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
          const [ name, description, ...genes ] = line.split("\t");
          if(genes[genes.length-1] === "") {
            genes.pop();
          }
          geneSets.push({ name, description, genes });
        });

        await this.db
            .collection(dbFileName)
            .insertMany(geneSets);

        await this.createIndexes(dbFileName);
    }


    async createIndexes(dbFileName) {
        await this.db
            .collection(dbFileName)
            .createIndex({ name: 1 });

        await this.db
            .collection(GENE_LISTS_COLLECTION)
            .createIndex({ networkID: 1 });

        await this.db
            .collection(GENE_LISTS_COLLECTION)
            .createIndex({ "genes.gene": 1 });
    }


    /**
     * Inserts a network document into the 'networks' collection.
     * @returns The id of the created document.
     */
    async createNetwork(networkJson) {
        if(typeof(networkJson) == 'string') {
            networkJson = JSON.parse(networkJson);
        }

        const networkID = makeID();

        networkJson['_id'] = networkID.bson;
        networkJson['networkIDStr'] = networkID.string;

        await this.db
            .collection(NETWORKS_COLLECTION)
            .insertOne(networkJson);

        return networkID.string;
    }

    /**
     * Inserts a ranked gene list document into the "geneLists" collection.
     * @returns The id of the created document.
     */
    async createRankedGeneList(rankedGeneListTSV, networkIDString) {
        const networkID  = makeID(networkIDString);
        const geneListID = makeID();
        
        const genes = [];
        var [min, max] = [Infinity, -Infinity];

        rankedGeneListTSV.split("\n").slice(1).forEach(line => {
            const [gene, rankStr] = line.split("\t");
            const rank = Number(rankStr);

            if(gene) {
                if(isNaN(rank)) {
                    genes.push({ gene });
                } else {
                    min = Math.min(min, rank);
                    max = Math.max(max, rank);
                    genes.push({ gene, rank });
                }
            }
        });

        const geneListDocument = {
            _id: geneListID.bson,
            networkID: networkID.bson,
            networkIDStr: networkID.string,
            min,
            max,
            genes
        };

        await this.db
            .collection(GENE_LISTS_COLLECTION)
            .insertOne(geneListDocument);

        return geneListID.string;
    }

    /**
     * Returns the entire network document. 
     */
    async getNetwork(networkIDString) {
        const networkID = makeID(networkIDString);
        const network = await this.db
            .collection(NETWORKS_COLLECTION)
            .findOne({ _id: networkID.bson });

        return network;
    }

    /**
     * Returns the rank of a gene.
     */
    async getGeneRank(networkIDString, geneName) {
        const networkID = makeID(networkIDString);

        const matches = await this.db
            .collection(GENE_LISTS_COLLECTION)
            .find({ networkID: networkID.bson })
            .project({ genes: { $elemMatch: { gene: geneName } }})
            .toArray();

        if(matches && matches.length > 0)
            return matches[0].genes[0];
    }

    /**
     * Returns the contents of a gene set, including the name,
     * description and gene list.
     */
    async getGeneSet(geneSetCollection, geneSetName) {
        return await this.db
            .collection(geneSetCollection)
            .findOne({ name: geneSetName });
    }

    /**
     * Returns the name and description of a gene set. 
     * Does not return the gene list.
     */
    // TODO Is this needed? Aren't the name and description available as node attributes?
    async getGeneSetInfo(geneSetCollection, geneSetName) {
        return await this.db
            .collection(geneSetCollection)
            .findOne(
                { name: geneSetName }, 
                { name: 1, description: 1 }
            );
    }

    /**
     * Returns the genes from one or more gene sets joined with ranks.
     * The returned array is sorted so that the genes with ranks are first (sorted by rank),
     * then the genes without rankes are after (sorted alphabetically).
     */
    async getGenesWithRanks(geneSetCollection, networkIDStr, geneSetNames) {
        if(geneSetNames === undefined || geneSetNames.length == 0)
            return { genes: [] };

        const minMax = await this.db
            .collection(GENE_LISTS_COLLECTION)
            .findOne(
                { networkIDStr }, 
                { projection: { min: 1, max: 1} } // min,max have special meaning in mongo, that's why 'projection:' is explicit
            ); 

        const geneListWithRanks = await this.db
            .collection(geneSetCollection)
            .aggregate([
                { $match: { name: { $in: geneSetNames } } },
                { $project: { genes: { $map: { input: "$genes", as: "g", in: { gene: "$$g" } } } } },
                { $unwind: "$genes" },
                { $replaceRoot: { newRoot: "$genes"} },
                { $group: {  _id: "$gene", gene: { $first: "$gene" } } },
                { $lookup: { // This is the Join
                    from: GENE_LISTS_COLLECTION,
                    let: { foreignGene: "$gene" },
                    pipeline: [
                        { $match: { networkIDStr } },
                        { $unwind: "$genes" },
                        { $replaceRoot: { newRoot: "$genes"} },
                        { $match: { $expr: { $eq: ["$gene", "$$foreignGene" ] } } }
                    ],
                    as: "newField"
                }},
                { $project: { _id: 0, gene: "$gene", rank: { $first: "$newField.rank" } } },
                { $sort: { rank: -1, gene: 1 } }
            ])
            .toArray();

        return { 
            minRank: minMax.min,
            maxRank: minMax.max,
            genes: geneListWithRanks  
        };
    }

}

const ds = new Datastore(); // singleton

export default ds;
