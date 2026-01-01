# Video Processor

## Requirements

- Google Cloud CLI

## Setup

### Submit Image

```bash
gcloud builds submit --tag gcr.io/your-project-id/video-processor
```

### Create Cloud Run Job

```bash
gcloud run jobs create video-processor \
  --image gcr.io/etm-cloud/video-processor \
  --region asia-south1 \
  --project your-project-id
```
