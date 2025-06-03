import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://Akshiro:72UfIdAEYOA7maIF@cluster0.pkzml06.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);

let db;

async function connect() {
  if (db) return db;
  await client.connect();
  db = client.db('Cluster0');
  return db;
}

export { connect };
