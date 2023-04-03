import dotenv from "dotenv";
import express from "express";
import { client, sendMessage, sendUpscaleNVariation } from "./bot.js";
import mongodb, { MongoClient } from "mongodb";
import { uploadFilesMiddleware } from "./middleware.js";
import cors from "cors";
import MongoDB from "./mongodb.js";
import crypto from "crypto";
import MessageQueue from "./queue.js";
import cookieParser from "cookie-parser";
import axios from "axios";
dotenv.config();
(async () => {
  try {
    const db = await MongoDB.getInstance().getDb();
    // db.collection("user-prompts").insertOne({
    //   uuid: "c0eb1cf1-d3b6-4d73-877a-f6db6ab86198",
    //   prompt:
    //     "A logo, dangerous. Utilizing a lego style. c0eb1cf1-d3b6-4d73-877a-f6db6ab86198 --chaos 9 - ",
    // });
  } catch (err) {
    console.log("unable to connect to the db", err);
  }
})();

const app = express();

const corsOptions = {
  origin: ["http://localhost:3000", "https://www.vectura.io"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Access-Control-Allow-Origin",
  ],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.listen(process.env.PORT, () => {
  console.log(`listening on http://localhost:${process.env.PORT}`);
});

export async function authUser(token) {
  try {
    const data = await axios.get(
      `${process.env.SITE_URL}/api/authentication/me`,
      {
        withCredentials: true,
        headers: {
          Cookie: `token=${token}`,
	Authorization: `Bearer ${token}`,
        },
      }
    );
    return data.data;
  } catch (err) {
    console.log("here", err);
    throw new Error(err);
  }
}

app.get("/query", async (req, res) => {
  console.log("query request reveived");
  let {
    prompt,
    chaos,
    not_present,
    style,
    type,
    referenceImageUrl,
    referenceImageName,
  } = req.query;
  console.log("params:", req.query);
  let desc = "";
  if (prompt) {
    desc = prompt;
  }
  let uuid = crypto.randomUUID();

  if (type) {
    desc = `A ${type}, ${desc}`;
  }

  if (style) {
    desc = `${desc}. Utilizing a ${style} style.`;
  }
  desc += uuid;

  if (chaos) {
    desc = `${desc} --chaos ${chaos}`;
  }
  if (not_present) {
    desc = `${desc} --no ${not_present}`;
  }
  if (referenceImageUrl) {
    desc = `https://api.ishworart.com/media/${referenceImageUrl} ${desc}`;
  }
  console.log({ desc });
  let token = req?.headers?.authorization?.split(" ")[1];
  console.log({ token, uuid });
  return;
  try {
    let user = {};
    if (token) {
      user = await authUser(token);
    }
    console.log("user: ", user);
    const db = await MongoDB.getInstance().getDb();
    const collection = await db.collection("users");
    if (user) {
      let givenUser = await collection.findOne({ email: user.email });

      console.log("givenUser: ", givenUser);

      if (givenUser?.credits < 1) {
        res.status(400).json({ message: "user does not have any" });
        return;
      }
    }
    await sendMessage(desc, uuid);
    await collection.updateOne(
      { email: user.email },
      { $inc: { credits: -1 } }
    );
    await MessageQueue.getInstance().add(uuid, {
      desc: prompt,
      chaos,
      not_present,
      style,
      type,
      token,
      referenceImageUrl,
      referenceImageName,
    });
    return res.json({ image_path: uuid + ".jpg" });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "internal server error" });
  }
});

app.get("/uv", async (req, res) => {
  console.log(req.query);
  //   return res.json({ message: "hello" });
  const { uuid, task } = req.query;
  try {
    const db = await MongoDB.getInstance().getDb();
    const usersCollection = await db.collection("users");
    const mjPostsCollection = await db.collection("mj-posts");
    let token = req?.headers?.authorization?.split(" ")[1];
    let user = null;
    if (!token) {
      res.status(400).json({ message: "invalid request" });
    }
    console.log({ token });
    user = await authUser(token);
    console.log("user: ", user);
    if (user) {
      let givenUser = await usersCollection.findOne({ email: user.email });
      let userPost = await mjPostsCollection.findOne({
        email: user.email,
        uuid: uuid,
      });
      console.log("givenUser: ", givenUser);

      if (!userPost) {
        res.status(400).json({ message: "give post does not belong to you" });
        return;
      }
      if (givenUser?.credits < 1) {
        res.status(400).json({ message: "user does not have any credits" });
        return;
      }
    } else {
      res.status(400).json({ message: "user does not exist" });
    }

    await sendUpscaleNVariation(JSON.stringify({ task: task, uuid: uuid }));
    usersCollection.updateOne({ email: user.email }, { $inc: { credits: -1 } });
    MessageQueue.getInstance().add(uuid, { uuid, task });
    console.log("done");
    return res.json({ task: task, uuid: uuid });
  } catch (err) {
    console.log("error", err);
  }
});

app.post("/upload", uploadFilesMiddleware, async (req, res) => {
  try {
    if (req.file == undefined) {
      return res.send({
        message: "You must select a file.",
      });
    }

    return res.json({
      imageName: req.file.filename,
    });
  } catch (error) {
    console.log(error);

    return res.send({
      message: "Error when trying upload image: ${error}",
    });
  }
});

app.get("/media/:uuid", async (req, res) => {
  const uuid = req.params.uuid;
  //   const client = await MongoClient.connect(process.env.DB_URL);
  //   const database = client.db("mj");
  const bucket = new mongodb.GridFSBucket(await MongoDB.getInstance().getDb(), {
    bucketName: "imagesBucket",
  });

  const downloadStream = bucket.openDownloadStreamByName(uuid);

  downloadStream.on("error", (err) => {
    console.error(err);
    res.sendStatus(404);
  });

  downloadStream.pipe(res);
});
client.login(process.env.TOKEN);
