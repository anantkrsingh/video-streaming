const { exec, spawn } = require("child_process");
const { Storage } = require("@google-cloud/storage");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");

const storage = new Storage();
const bucketName = process.env.INPUT_BUCKET || "raw-videos-pulse";
const outputBucket = process.env.OUTPUT_BUCKET || "processed-videos-pulse";

// Environment variables passed from Cloud Run job
const fileName = process.env.FILE_NAME;
const videoId = process.env.VIDEO_ID;
const processingToken = process.env.PROCESSING_TOKEN;
const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3000";

if (!fileName) {
  console.error("FILE_NAME env missing");
  process.exit(1);
}

/**
 * Make HTTP request to update processing status
 */
const updateProgress = async (progress, stage) => {
  if (!videoId || !processingToken || !apiBaseUrl) {
    console.log("Skipping progress update - missing credentials");
    return;
  }

  const url = `${apiBaseUrl}/api/processing/${videoId}/progress`;
  const data = JSON.stringify({ progress, stage });

  return makeRequest(url, "POST", data);
};

/**
 * Mark processing as complete
 */
const completeProcessing = async (hlsUrl, duration, resolution) => {
  if (!videoId || !processingToken || !apiBaseUrl) {
    console.log("Skipping complete update - missing credentials");
    return;
  }

  const url = `${apiBaseUrl}/api/processing/${videoId}/complete`;
  const data = JSON.stringify({
    hlsUrl,
    videoUrl: hlsUrl, // Use HLS URL as the main video URL
    duration,
    resolution,
  });

  return makeRequest(url, "POST", data);
};

/**
 * Mark processing as failed
 */
const failProcessing = async (error, stage) => {
  if (!videoId || !processingToken || !apiBaseUrl) {
    console.log("Skipping failure update - missing credentials");
    return;
  }

  const url = `${apiBaseUrl}/api/processing/${videoId}/failed`;
  const data = JSON.stringify({ error, stage });

  return makeRequest(url, "POST", data);
};

/**
 * Helper function to make HTTP requests
 */
const makeRequest = (url, method, data) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname,
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        Authorization: `Bearer ${processingToken}`,
      },
    };

    const protocol = parsedUrl.protocol === "https:" ? https : http;
    const req = protocol.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData || "{}"));
        } else {
          console.error(`API error: ${res.statusCode} - ${responseData}`);
          resolve(null); // Don't reject, just log error
        }
      });
    });

    req.on("error", (error) => {
      console.error("Request error:", error.message);
      resolve(null); // Don't reject, just log error
    });

    req.write(data);
    req.end();
  });
};

/**
 * Get video duration and resolution using ffprobe
 */
const getVideoMetadata = (inputPath) => {
  return new Promise((resolve) => {
    const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${inputPath}"`;
    exec(cmd, (err, stdout) => {
      if (err) {
        console.error("ffprobe error:", err);
        resolve({ duration: null, resolution: null });
        return;
      }

      try {
        const metadata = JSON.parse(stdout);
        const videoStream = metadata.streams?.find((s) => s.codec_type === "video");
        const duration = metadata.format?.duration
          ? parseFloat(metadata.format.duration)
          : null;
        const resolution = videoStream
          ? { width: videoStream.width, height: videoStream.height }
          : null;

        resolve({ duration, resolution });
      } catch (e) {
        console.error("Error parsing metadata:", e);
        resolve({ duration: null, resolution: null });
      }
    });
  });
};

/**
 * Main processing function
 */
(async () => {
  console.log("=== Video Processing Started ===");
  console.log("File:", fileName);
  console.log("Video ID:", videoId || "N/A");
  console.log("API URL:", apiBaseUrl);

  const inputTemp = "/tmp/input.mp4";
  const outputDir = `/tmp/${fileName}-hls`;
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    // Stage 1: Downloading
    await updateProgress(5, "Downloading from storage");
    console.log("Downloading from GCS...");

    await storage.bucket(bucketName).file(fileName).download({ destination: inputTemp });
    console.log("Downloaded to", inputTemp);
    await updateProgress(15, "Download complete");

    // Get video metadata
    const { duration, resolution } = await getVideoMetadata(inputTemp);
    console.log("Video duration:", duration, "seconds");
    console.log("Video resolution:", resolution);

    // Stage 2: Converting to HLS
    await updateProgress(20, "Starting conversion");
    console.log("Starting FFmpeg conversion...");

    const hlsPath = path.join(outputDir, "output.m3u8");
    const ffmpegCmd = [
      "-i", inputTemp,
      "-codec:v", "libx264",
      "-codec:a", "aac",
      "-hls_time", "10",
      "-hls_playlist_type", "vod",
      "-hls_segment_filename", `${outputDir}/segment%03d.ts`,
      "-start_number", "0",
      "-progress", "pipe:1", // Output progress to stdout
      hlsPath,
    ];

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", ffmpegCmd);
      let lastProgress = 20;

      ffmpeg.stdout.on("data", (data) => {
        const output = data.toString();
        // Parse progress from ffmpeg output
        const timeMatch = output.match(/out_time_ms=(\d+)/);
        if (timeMatch && duration) {
          const currentTime = parseInt(timeMatch[1]) / 1000000; // Convert microseconds to seconds
          const progress = Math.min(
            Math.round(20 + (currentTime / duration) * 60),
            80
          );
          if (progress > lastProgress) {
            lastProgress = progress;
            updateProgress(progress, "Converting video");
          }
        }
      });

      ffmpeg.stderr.on("data", (data) => {
        // FFmpeg outputs progress info to stderr
        const output = data.toString();
        if (output.includes("time=")) {
          const timeMatch = output.match(/time=(\d+):(\d+):(\d+)/);
          if (timeMatch && duration) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const seconds = parseInt(timeMatch[3]);
            const currentTime = hours * 3600 + minutes * 60 + seconds;
            const progress = Math.min(
              Math.round(20 + (currentTime / duration) * 60),
              80
            );
            if (progress > lastProgress) {
              lastProgress = progress;
              updateProgress(progress, "Converting video");
            }
          }
        }
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on("error", (err) => {
        reject(err);
      });
    });

    console.log("Conversion complete!");
    await updateProgress(85, "Uploading processed files");

    // Stage 3: Upload HLS files to GCS
    console.log("Uploading HLS files to GCS...");
    const files = fs.readdirSync(outputDir);
    const totalFiles = files.length;
    let uploadedFiles = 0;

    for (const f of files) {
      await storage.bucket(outputBucket).upload(`${outputDir}/${f}`, {
        destination: `${fileName}/${f}`,
      });
      uploadedFiles++;
      const uploadProgress = Math.round(85 + (uploadedFiles / totalFiles) * 10);
      await updateProgress(uploadProgress, "Uploading processed files");
    }

    // Make HLS files publicly accessible
    const [outputFiles] = await storage.bucket(outputBucket).getFiles({
      prefix: `${fileName}/`,
    });
    for (const file of outputFiles) {
      await file.makePublic();
    }

    const hlsUrl = `https://${outputBucket}.storage.googleapis.com/${fileName}/output.m3u8`;
    console.log("Upload complete!");
    console.log(`HLS URL: ${hlsUrl}`);

    // Stage 4: Complete
    await updateProgress(100, "Complete");
    await completeProcessing(hlsUrl, duration, resolution);

    console.log("=== Video Processing Complete ===");
    process.exit(0);
  } catch (error) {
    console.error("Processing error:", error);
    await failProcessing(error.message, "Processing failed");
    process.exit(1);
  }
})();
