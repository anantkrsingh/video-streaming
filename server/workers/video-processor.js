const { PubSub } = require("@google-cloud/pubsub");
const { GoogleAuth } = require("google-auth-library");
const Video = require("../models/Video");

const pubsub = new PubSub({ keyFilename: process.env.GCP_CREDENTIALS });

const SUBSCRIPTION_NAME = "video-upload-sub";
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

try {
  const subscription = pubsub.subscription(SUBSCRIPTION_NAME);

  console.log("Pub/Sub Listener Started...");
  console.log(`Listening on subscription: ${SUBSCRIPTION_NAME}\n`);

  subscription.on("message", async (message) => {
    const data = JSON.parse(message.data);
    const fileName = data.name;
    console.log("Uploaded file:", fileName);
    
    // Skip thumbnail files (they don't need video processing)
    if (fileName.startsWith("thumbnails/")) {
      console.log("Skipping thumbnail file:", fileName);
      message.ack();
      return;
    }
    
    await triggerVideoProcessor(fileName);
    message.ack();
  });
  subscription.on("error", (error) => {
    console.error("Pub/Sub subscription error:", error);
  });
} catch (error) {
  console.error("Error starting Pub/Sub listener:", error);
}

/**
 * Trigger video processing on Cloud Run
 * Finds the video by GCS filename and passes the processing token
 */
const triggerVideoProcessor = async (fileName) => {
  try {
    // Find video by GCS filename and get the processing token
    const video = await Video.findOne({ gcsFileName: fileName }).select("+processingToken");
    
    if (!video) {
      console.log(`No video found for file: ${fileName}. May be a direct upload or old file.`);
      return;
    }

    if (!video.processingToken) {
      console.log(`No processing token found for video: ${video._id}`);
      return;
    }

    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      keyFilename: process.env.GCP_CREDENTIALS,
    });

    const client = await auth.getClient();
    const jobUrl = `https://asia-south1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${GCP_PROJECT_ID}/jobs/video-processor:run`;

    await client.request({
      url: jobUrl,
      method: "POST",
      data: {
        overrides: {
          containerOverrides: [
            {
              env: [
                {
                  name: "FILE_NAME",
                  value: fileName,
                },
                {
                  name: "VIDEO_ID",
                  value: video._id.toString(),
                },
                {
                  name: "PROCESSING_TOKEN",
                  value: video.processingToken,
                },
                {
                  name: "API_BASE_URL",
                  value: API_BASE_URL,
                },
              ],
            },
          ],
        },
      },
    });

    console.log(`Processing started on Cloud Run Job for video ${video._id}: ${fileName}`);
  } catch (error) {
    console.error("Error triggering video processor:", error);
  }
};
