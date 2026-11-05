import {
  GetObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.VILCO_MEDIA_BUCKET || "vilco-media";
let client;
let corsPromise;

function getClient() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("VILCO Neon Object Storage is not configured.");
  }
  if (!client) {
    client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey }
    });
  }
  return client;
}

function safeKey(key) {
  return typeof key === "string" &&
    key.startsWith("uploads/") &&
    !key.split("/").some((part) => !part || part === "." || part === "..") &&
    /^[A-Za-z0-9._/-]+$/.test(key);
}

export async function configureUploadCors(origin) {
  const expectedOrigin = process.env.VILCO_APP_ORIGIN;
  if (!expectedOrigin || origin !== expectedOrigin) {
    throw new Error("The VILCO app origin is not allowed for media uploads.");
  }
  if (!corsPromise) {
    corsPromise = getClient().send(new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: [{
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "HEAD", "PUT"],
          AllowedOrigins: [expectedOrigin],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600
        }]
      }
    })).catch((error) => {
      corsPromise = null;
      throw error;
    });
  }
  await corsPromise;
}

export async function createUploadUrl(key, contentType) {
  if (!safeKey(key)) throw new Error("Invalid VILCO media path.");
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType
  });
  return getSignedUrl(getClient(), command, { expiresIn: 300 });
}

export async function createDownloadUrl(key) {
  if (!safeKey(key)) throw new Error("Invalid VILCO media path.");
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: 604800 });
}

export async function getPrivateObject(key) {
  if (!safeKey(key)) throw new Error("Invalid VILCO media path.");
  return getClient().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
}
