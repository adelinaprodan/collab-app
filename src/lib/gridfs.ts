import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";

let bucket: GridFSBucket | null = null;

export function getGridFSBucket() {
  if (bucket) return bucket;

  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB not connected yet");

  bucket = new GridFSBucket(db, { bucketName: "projectFiles" });
  return bucket;
}
