import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing environment variable MONGODB_URI");
}

const options = {};

declare global {
  // eslint-disable-next-line no-var
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

const client = new MongoClient(uri, options);

const mongoClientPromise =
  global.mongoClientPromise ?? client.connect().then(() => client);

if (process.env.NODE_ENV !== "production") {
  global.mongoClientPromise = mongoClientPromise;
}

export default mongoClientPromise;
