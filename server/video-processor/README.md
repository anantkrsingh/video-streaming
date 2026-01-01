
# Requirements : Google Cloud CLI
# Submit Image 
`gcloud builds submit --tag gcr.io/etm-cloud/video-processor`

# Create Cloud Run Job
` gcloud run jobs create video-processor \
  --image gcr.io/etm-cloud/video-processor \
  --region asia-south1 \
  --project etm-cloud`
