import mongo, { MongoClient } from "mongodb";

export default class MongoDB {
  static #instance;
  db;

  static getInstance() {
    if (!MongoDB.#instance) {
      MongoDB.#instance = new MongoDB();
    }
    return MongoDB.#instance;
  }

  async connect() {
    console.log("starting the connection...");
    const connectionString = process.env.DB_URL;
    const client = await MongoClient.connect(connectionString);
    this.db = client.db("development");
    console.log("connected successful");
  }

  async close() {
    if (this.db) {
      await this.db.client.close();
      this.db = null;
    }
  }

  async getDb() {
    if (!this.db) {
      await this.connect();
    }

    return this.db;
  }
}
