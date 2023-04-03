import { assert } from "console";
import fs from "fs";
import messageQueue from "../messageQueue.json" assert { type: "json" };
export default class MessageQueue {
  static #instance;
  uuids;
  constructor() {
    this.fetchFromJSON();
  }

  static getInstance() {
    if (!MessageQueue.#instance) {
      MessageQueue.#instance = new MessageQueue();
    }
    return MessageQueue.#instance;
  }

  fetchFromJSON() {
    this.uuids = messageQueue;
  }

  includes(uuid) {
    return this.uuids.hasOwnProperty(uuid);
  }

  remove(uuid) {
    // this.uuids.splice(this.uuids.indexOf(uuid), 1);
    delete this.uuids[uuid];
    fs.writeFileSync("../messageQueue.json", JSON.stringify(this.uuids));
    this.fetchFromJSON();
  }
  async add(uuid, userPrompt) {
    this.uuids[uuid] = userPrompt;
    console.log(this.uuids);
    await fs.writeFileSync("../messageQueue.json", JSON.stringify(this.uuids));
    this.fetchFromJSON();
  }
  get(uuid) {
    return this.uuids[uuid];
  }
  getAll() {
    return this.uuids;
  }
}
