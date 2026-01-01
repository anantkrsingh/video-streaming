const { exec } = require("child_process");
const { Storage } = require("@google-cloud/storage");
const path = require("path");
const fs = require("fs");

const storage = new Storage();
const bucketName = "raw-videos-pulse";
const outputBucket = "processed-videos-pulse";

const fileName = process.env.FILE_NAME;
if (!fileName) {
  console.error("FILE_NAME env missing");
  process.exit(1);
}

(async () => {
  console.log("Processing started for:", fileName);

  const inputTemp = "/tmp/input.mp4";
  const outputDir = `/tmp/${fileName}-hls`;
  fs.mkdirSync(outputDir, { recursive: true });

  // download from bucket
  await storage.bucket(bucketName).file(fileName).download({ destination: inputTemp });
  console.log("Downloaded to", inputTemp);

  const hlsPath = path.join(outputDir, "output.m3u8");
  const cmd = `ffmpeg -i ${inputTemp}  -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputDir}/segment%03d.ts" -start_number 0 ${hlsPath}`;

  exec(cmd, async (err) => {
    if (err) {
      console.error("FFmpeg error", err);
      return process.exit(1);
    }

    console.log("Conversion complete. Uploading...");

    // Upload .m3u8 + .ts segments
    const files = fs.readdirSync(outputDir);
    for (const f of files) {
      await storage.bucket(outputBucket).upload(`${outputDir}/${f}`, {
        destination: `${fileName}/${f}`,
      });
    }

    console.log("Upload complete!");
    console.log(`HLS files at: gs://${outputBucket}/${fileName}/output.m3u8`);
    process.exit(0);
  });

})();
