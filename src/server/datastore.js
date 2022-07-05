import { ObjectID } from 'bson';
import { MongoClient } from 'mongodb';
import { MONGO_URL, MONGO_ROOT_NAME, MONGO_COLLECTION_QUERIES } from './env.js';

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
        const result = await this.db.collection('networks').insertOne(networkJson);
        return result.insertedId;
    }

    async getNetwork(netID) {
       const network = await this.db.collection('networks').findOne({ '_id': ObjectID(netID) });
       return network;
    }
}

const ds = new Datastore(); // singleton

export default ds;
