import { S3 } from "@aws-sdk/client-s3";
import * as Sentry from "@sentry/node";
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from "util";

import { S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_USER_UPLOAD_BUCKET, NODE_ENV } from '../../env.js';
import { PutObjectCommand } from "@aws-sdk/client-s3";

const enabled = S3_ENDPOINT != null;

const gzip = promisify(zlib.gzip);

let s3;

if (enabled) {
  s3 = new S3({
    endpoint: S3_ENDPOINT,
    region: "us-east-1",
    credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY
    }
  });
}

export async function saveUserUploadFileToS3(textFileContent, fileName, contentType) {
  if (!enabled) { return; }
  try {
    const buffer = await gzip(textFileContent);
    const bufferFileName = `${fileName}.gz`;

    // you can use this line to debug by writing the file to the local fs instead of r2/s3
    //await fs.promises.writeFile(path.relative(".", bufferFileName), buffer);

    await s3.send(new PutObjectCommand({
      Bucket: S3_USER_UPLOAD_BUCKET,
      ContentType: contentType,
      Key: bufferFileName,
      Body: buffer
    }));
  } catch (err) {
    console.error(err);
    Sentry.captureException(err);
  }
}