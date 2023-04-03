import { Client } from "discord.js-selfbot-v13";
import dotenv from "dotenv";
import fetch from "node-fetch";
import mongodb, { MongoClient, ObjectId } from "mongodb";
import MongoDB from "./mongodb.js";
import MessageQueue from "./queue.js";
import { authUser } from "./app.js";

dotenv.config();
export const client = new Client({
  checkUpdate: false,
});
client.on("ready", async () => {
  console.log(`${client.user.username} is ready!`);
});

client.on("messageCreate", async (message) => {
  if (
    !(
      message.channelId === process.env.CHANNEL_ID &&
      message.author.id === process.env.BOT_ID
    )
  ) {
    try {
      const { task, uuid } = JSON.parse(message.content);

      console.log("I am here");
      const db = await MongoDB.getInstance().getDb();
      const collection = db.collection("mj-posts");
      const prompt = await collection.findOne({ uuid: uuid });
      console.log(prompt);
      if (!prompt) {
        throw new Error("prompt does not exist");
      }
      console.log(prompt);
      const messages = await message.channel.messages.fetch({ limit: 100 });
      const keywordMessages = messages.find(
        (m) =>
          m.content === prompt.prompt && m.author.username === "Midjourney Bot"
      );
      if (keywordMessages.components.length > 0) {
        // Loop through each ActionRow in the message's components
        for (const actionRow of keywordMessages.components) {
          // Loop through each Button in the ActionRow
          for (const button of actionRow.components) {
            if (button.label === task) {
              console.log(button, keywordMessages.content);
              keywordMessages.clickButton(button.customId);
              return;
            }
          }
        }
      }
    } catch (err) {
      console.log(err, "err");
    }
  } else {
    let message_content = message.content;
    console.log(message, "message_content");
    let uuid, match;
    try {
      const regex =
        /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?=[^\w-]|$)/i; // UUID pattern
      uuid = message_content.match(regex)[0];
      console.log(uuid, "found uuid");
    } catch (e) {
      console.log("regex failed in uuid");
      return;
    }
    if (
      message_content.includes("Upscaled") ||
      message_content.includes("Variations")
    ) {
      const attachment = message.attachments.first();
      console.log(message);
      message.attachments;
      console.log(attachment.url);
      const response = await fetch(attachment.url);
      console.log("sending request to attachment url");
      if (response.status !== 200) {
        console.log("here attachment url returned", response.status);
        return;
      }
      console.log("received image");
      const db = await MongoDB.getInstance().getDb();
      const task = MessageQueue.getInstance().get(uuid)["task"];
      const bucket = new mongodb.GridFSBucket(db, {
        bucketName: "imagesBucket",
      });
      response.body.pipe(
        bucket.openUploadStream(`${uuid}-${task}.jpg`, {
          metadata: { uuid: `${uuid}-${task}` },
        })
      );

      console.log(`image Upload successful: ${uuid}-${task}.jpg`);
      console.log({ uuid, task });
      const collection = await db.collection("mj-posts");
      const update = {};
      console.log(task);
      update[task] = `${uuid}-${task}`;
      await collection.updateOne(
        { uuid: uuid },
        { $set: { [task]: `${uuid}-${task}` } }
      );
      console.log("done");
    } else {
      try {
        let regex = /\(fast\)/;
        match = message_content.match(regex)[0];
        console.log("(fast) matched");
      } catch (e) {
        console.log("regex failed in match()");
        if (process.env.PRODUCTION === "false") {
          return;
        }
      }
      try {
        let regex = /\(relaxed\)/;
        match = message_content.match(regex)[0];
        console.log("(relaxed) matched");
      } catch (e) {
        console.log("regex failed in relaxed()");
        if (process.env.PRODUCTION == "true") {
          return;
        }
      }

      if (MessageQueue.getInstance().includes(uuid)) {
        const attachment = message.attachments.first();
        console.log(message);
        message.attachments;
        console.log(attachment.url);
        try {
          const response = await fetch(attachment.url);
          console.log("sending request to attachment url");
          if (response.status !== 200) {
            console.log("here attachment url returned", response.status);
            return;
          }
          console.log("received image");
          const db = await MongoDB.getInstance().getDb();
          const bucket = new mongodb.GridFSBucket(db, {
            bucketName: "imagesBucket",
          });
          console.log("uploading image");

          response.body.pipe(
            bucket.openUploadStream(`${uuid}.jpg`, {
              metadata: { uuid: uuid },
            })
          );
          const collection = db.collection("mj-posts");
          console.log("image upload successful");
          const userPromptDetails = MessageQueue.getInstance().get(uuid);
          const {
            desc,
            chaos,
            not_present,
            style,
            type,
            token,
            referenceImageName,
          } = userPromptDetails;
          let user = {};
          if (token) {
            user = await authUser(token);
          }
          const doc = {
            email: user.email || null,
            uuid,
            desc: desc,
            chaos: chaos,
            not_present: not_present,
            style: style,
            type: type,
            prompt: message_content,
            referenceImageName: referenceImageName,
          };
          const result = await collection.insertOne(doc);
          console.log(result);
          console.log(`${result.insertedCount} documents were inserted`);
          MessageQueue.getInstance().remove(uuid);
        } catch (e) {
          console.log("something went wrong", e);
        }
      } else {
        console.log(MessageQueue.getInstance().getAll());
        console.log("uuid not found in queue");
      }
      MessageQueue.getInstance().remove(uuid);
    }
  }
});

export const sendUpscaleNVariation = async (message) => {
  const channel = await client.channels.fetch(process.env.CHANNEL_ID);
  try {
    await channel.send(message);
  } catch (err) {
    console.log(err, "could not send message");
  }
};

// export async function addPostsToUser(token) {
//   try {
//     const user = await authUser(token);
//     console.log("auth complete", user.email);
//     const db = await MongoDB.getInstance().getDb("development");
//     const usersCollection = await db.collection("mj-posts");
//     console.log(updated);
//   } catch (err) {
//     console.log(err);
//   }
// }

export const sendMessage = async (message, uuid) => {
  const channel = await client.channels.fetch(process.env.CHANNEL_ID);
  try {
    await channel.sendSlash(process.env.BOT_ID, "imagine", message);
    console.log(MessageQueue.getInstance().getAll());
    console.log("slash sent");
    return uuid;
  } catch (e) {
    console.log(e);
    console.log("failed");
    throw new Error(e);
  }
};
