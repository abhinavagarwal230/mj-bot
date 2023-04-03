import util from "util";
import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";
import dotenv from "dotenv";
import crypto from "crypto";
import { MongoAPIError } from "mongodb";
import MongoDB from "./mongodb.js";
dotenv.config();

const storage = new GridFsStorage({
  db: MongoDB.getInstance().getDb(),
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: async (req, file) => {
    const uuid = crypto.randomUUID();
    return {
      bucketName: "imagesBucket",
      filename: `${uuid}.${file.originalname.split(".").pop()}`,
    };
  },
});

const uploadFiles = multer({ storage: storage }).single("file");
export const uploadFilesMiddleware = util.promisify(uploadFiles);
