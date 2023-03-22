import { Client } from "discord.js-selfbot-v13";
import dotenv from "dotenv";
import fetch from "node-fetch";
import crypto from "crypto";
import mongodb, { MongoClient } from "mongodb";

dotenv.config();
export const client = new Client({
  checkUpdate: false,
});

client.on("ready", async () => {
  console.log(`${client.user.username} is ready!`);
});

const messageQueue = [];

client.on("messageCreate", async (message) => {
  if (
    !(
      message.channelId === process.env.CHANNEL_ID &&
      message.author.id === process.env.BOT_ID
    )
  ) {
    return;
  }

  let message_content = message.content;
  console.log(messageQueue);
  let uuid, match;
  try {
    // let  =
    //   /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/;
    const regex =
      /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?=[^\w-]|$)/i; // UUID pattern
    uuid = message_content.match(regex)[0];
    console.log(uuid, "found uuid");
  } catch (e) {
    console.log("regex failed in uuid");
    return;
  }
  try {
    let regex = /\(fast\)/;
    match = message_content.match(regex)[0];
    console.log("(fast) matched");
  } catch (e) {
    console.log("regex failed in match()");
    return;
  }

  if (uuid === messageQueue[0]) {
    const attachment = message.attachments.first();
    console.log(attachment.url);
    try {
      const response = await fetch(attachment.url);
      if (response.status !== 200) {
        return;
      }
      const client = await MongoClient.connect(process.env.DB_URL);
      const database = client.db("mydb");
      const bucket = new mongodb.GridFSBucket(database, {
        bucketName: "imagesBucket",
      });

      response.body.pipe(
        bucket.openUploadStream(`${uuid}.jpg`, {
          metadata: { uuid: uuid },
        })
      );
    } catch (e) {
      console.log("something went wrong", e);
    }
  } else {
    console.log("uuid not found in queue");
  }
  messageQueue.shift();
});
export const sendMessage = async (message, uuid) => {
  const channel = await client.channels.fetch(process.env.CHANNEL_ID);
  try {
    await channel.sendSlash("936929561302675456", "imagine", message);
    messageQueue.push(uuid);
    console.log(messageQueue);
    console.log("slash sent");
    return uuid;
  } catch (e) {
    console.log("failed");
    console.log(e);
  }
};
