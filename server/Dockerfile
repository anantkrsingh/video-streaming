# Server Dockerfile
FROM node:20-alpine

# Install ffmpeg for video thumbnail generation
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Create temp directory for uploads
RUN mkdir -p temp
RUN mkdir -p /app

# Expose port
EXPOSE 3000

# Start the server (use node instead of nodemon for production)
CMD ["/bin/sh", "-c", "echo \"$GCP_SERVICE_ACCOUNT\" > /app/service-account.json && npm start"]
