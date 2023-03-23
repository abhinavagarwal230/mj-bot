import dotenv from "dotenv";
import express from "express";
import { client, sendMessage } from "./bot.js";
import mongodb, { MongoClient } from "mongodb";
import { uploadFilesMiddleware } from "./middleware.js";
import cors from "cors";

import crypto from "crypto";
dotenv.config();

const app = express()

const corsOptions = {
  origin: "*",
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.listen(process.env.PORT, () => {
  console.log(`listening on http://localhost:${process.env.PORT}`);
});



app.get("/query", async (req, res) => {
  let { desc, chaos, not_present } = req.query;
  desc += " ";
  let uuid = crypto.randomUUID();

  desc += uuid;

  if (chaos) {
    desc += ` --chaos ${chaos}`;
  }
  if (not_present) {
    desc += ` --no ${not_present}`;
  }

  let id = await sendMessage(desc, uuid);
  if (id) {
    return res.json({ image_path: id + ".jpg" });
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
  const client = await MongoClient.connect(process.env.DB_URL);
  const database = client.db("mydatabase");
  const bucket = new mongodb.GridFSBucket(database, {
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
