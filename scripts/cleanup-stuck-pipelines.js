/**
 * Cleanup script to clear stuck pipeline jobs
 * Run with: node scripts/cleanup-stuck-pipelines.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING;

async function cleanupStuckPipelines() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected.");

    const db = mongoose.connection.db;
    const collection = db.collection("pipelinejobs");

    // Find stuck pipelines (in processing states for more than 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const stuckPipelines = await collection.find({
      status: { $in: ["extracting", "aligning", "indexing", "generating", "pending"] },
      updatedAt: { $lt: tenMinutesAgo }
    }).toArray();

    console.log(`Found ${stuckPipelines.length} stuck pipelines.`);

    if (stuckPipelines.length > 0) {
      // Cancel all stuck pipelines
      const result = await collection.updateMany(
        {
          status: { $in: ["extracting", "aligning", "indexing", "generating", "pending"] },
          updatedAt: { $lt: tenMinutesAgo }
        },
        {
          $set: { 
            status: "cancelled",
            completedAt: new Date()
          }
        }
      );

      console.log(`Cancelled ${result.modifiedCount} stuck pipelines.`);
    }

    // Also show current active pipelines
    const activePipelines = await collection.find({
      status: { $in: ["extracting", "aligning", "indexing", "generating"] }
    }).toArray();

    console.log(`\nCurrently active pipelines: ${activePipelines.length}`);
    for (const p of activePipelines) {
      console.log(`  - ${p._id} | Status: ${p.status} | Lesson: ${p.lessonId} | Started: ${p.startedAt}`);
    }

    console.log("\nDone.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

cleanupStuckPipelines();
