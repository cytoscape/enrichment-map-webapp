import { MongoClient } from 'mongodb';
import { MONGO_URL, MONGO_ROOT_NAME, MONGO_COLLECTION_QUERIES } from './env.js';
import uuid from 'uuid';
import MUUID from 'uuid-mongodb';

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
        const mongo = this.mongo = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = this.db = mongo.db(MONGO_ROOT_NAME);
        const queries = this.queries = db.collection(MONGO_COLLECTION_QUERIES);
        console.info('Connected to MongoDB');
    }


    async createNetwork(networkJson) {
        if(typeof(networkJson) == 'string') {
            networkJson = JSON.parse(networkJson);
        }

        const networkID = makeID();

        networkJson['_id'] = networkID.bson;
        await this.db.collection('networks').insertOne(networkJson);

        return networkID.string;
    }


    async createRankedGeneList(rankedGeneListTSV, networkIDString) {
        const networkID  = makeID(networkIDString);
        const geneListID = makeID();

        const geneList = {
            _id: geneListID.bson,
            networkID: networkID.bson,
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


    async getGeneInfo(networkIDString, geneName) {
        const networkID = makeID(networkIDString);

        const matches = await this.db
            .collection('geneLists')
            .find({ networkID: networkID.bson })
            .project({ genes: { $elemMatch: { gene: geneName } }})
            .toArray();

        if(matches && matches.length > 0)
            return matches[0].genes[0];
    }

}

const ds = new Datastore(); // singleton

export default ds;
