const { PubSub } = require("@google-cloud/pubsub");
const { GoogleAuth } = require("google-auth-library");

const pubsub = new PubSub({ keyFilename: process.env.GCP_CREDENTIALS });

const SUBSCRIPTION_NAME = "video-upload-sub";
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;

try {
  const subscription = pubsub.subscription(SUBSCRIPTION_NAME);

  console.log("Pub/Sub Listener Started...");
  console.log(`Listening on subscription: ${SUBSCRIPTION_NAME}\n`);

  subscription.on("message", async (message) => {
    const data = JSON.parse(message.data);
    const file = data.name;
    console.log("Uploaded file:", file);
    await triggerVideoProcessor(file);
    message.ack();
  });
  subscription.on("error", (error) => {
    console.error("Pub/Sub subscription error:", error);
  });
} catch (error) {
  console.error("Error starting Pub/Sub listener:", error);
}

const triggerVideoProcessor = async (fileName) => {
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
            ],
          },
        ],
      },
    },
  });

  console.log("Processing started on Cloud Run Job for:", fileName);
};
