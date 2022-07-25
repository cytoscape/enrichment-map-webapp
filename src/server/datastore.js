import { MongoClient } from 'mongodb';
import uuid from 'uuid';
import MUUID from 'uuid-mongodb';
import { fileForEachLine } from './util.js';


export const DB_1 = 'Human_GOBP_AllPathways_no_GO_iea_June_01_2022_symbol.gmt';


function makeID(string) {
    if(!string) {
        string = uuid.v4();
    }
    const bson = MUUID.from(string);
    return { string, bson };
}


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


    async loadGenesetDB(path, fileName) {
        const collections = await this.db.listCollections().toArray();
        if(collections.some(c => c.name === fileName)) {
            console.info("Collection " + fileName + " already loaded");
            return;
        } else {
            console.info("Loading collection " + fileName);
        }

        const filepath = path + fileName;
        const geneSets = [];

        await fileForEachLine(filepath, line => {
          const [ name, description, ...genes ] = line.split("\t");
          if(genes[genes.length-1] === "") {
            genes.pop();
          }
          geneSets.push({ name, description, genes });
        });

        await this.db.collection(fileName).insertMany(geneSets);
    }


    async createNetwork(networkJson) {
        if(typeof(networkJson) == 'string') {
            networkJson = JSON.parse(networkJson);
        }

        const networkID = makeID();

        networkJson['_id'] = networkID.bson;
        networkJson['networkIDStr'] = networkID.string;
        await this.db.collection('networks').insertOne(networkJson);

        return networkID.string;
    }


    async createRankedGeneList(rankedGeneListTSV, networkIDString) {
        const networkID  = makeID(networkIDString);
        const geneListID = makeID();

        const geneList = {
            _id: geneListID.bson,
            networkID: networkID.bson,
            networkIDStr: networkID.string,
            genes: []
        };
        
        rankedGeneListTSV.split("\n").slice(1).forEach(line => {
            const [gene, rank] = line.split("\t");
            geneList.genes.push({ gene, rank: Number(rank) });
        });

        await this.db.collection('geneLists').insertOne(geneList);

        return geneListID.string;
    }


    async getNetwork(networkIDString) {
        const networkID = makeID(networkIDString);

        const network = await this.db
            .collection('networks')
            .findOne({ _id: networkID.bson });

        return network;
    }


    async getGeneRank(networkIDString, geneName) {
        const networkID = makeID(networkIDString);

        const matches = await this.db
            .collection('geneLists')
            .find({ networkID: networkID.bson })
            .project({ genes: { $elemMatch: { gene: geneName } }})
            .toArray();

        if(matches && matches.length > 0)
            return matches[0].genes[0];
    }

    // Returns just the contents of a gene set.
    async getGeneSet(geneSetCollection, geneSetName) {
        return await this.db
            .collection(geneSetCollection)
            .findOne({ name: geneSetName });
    }

    // Returns the gene set with the genes joined with the ranks.
    async getGeneSetWithRanks(geneSetCollection, geneSetName, networkIDStr) {
        const geneSetInfo = await this.db
            .collection(geneSetCollection)
            .findOne({ name: geneSetName }, { name: 1, description: 1 });

        const geneListWithRanks = await this.db
            .collection(geneSetCollection)
            .aggregate([
                { $match: { name: geneSetName } },
                { $project: { genes: { $map: { input: "$genes", as: "g", in: { gene: "$$g" } } } } },
                { $unwind: "$genes" },
                { $replaceRoot: { newRoot: "$genes"} },
                { $lookup: {
                    from: "geneLists",
                    let: { foreignGene: "$gene" },
                    pipeline: [
                        { $match: { networkIDStr } },
                        { $unwind: "$genes" },
                        { $replaceRoot: { newRoot: "$genes"} },
                        { $match: { $expr: { $eq: ["$gene", "$$foreignGene" ] } } }
                    ],
                    as: "newField"
                }},
                { $project: { gene: "$gene", rank: { $first: "$newField.rank" } } }
            ]).toArray();

        return {
            name: geneSetInfo.name,
            description: geneSetInfo.description,
            genes: geneListWithRanks
        };
    }

}

const ds = new Datastore(); // singleton

export default ds;
