import util from "util";
import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();

const storage = new GridFsStorage({
  url: process.env.DB_URL,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: async (req, file) => {
    console.log(file);
    const uuid = crypto.randomUUID();
    return {
      bucketName: "imagesBucket",
      filename: `${uuid}.${file.originalname.split(".").pop()}`,
    };
  },
});

const uploadFiles = multer({ storage: storage }).single("file");
export const uploadFilesMiddleware = util.promisify(uploadFiles);
