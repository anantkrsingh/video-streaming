FROM ubuntu:focal

RUN apt-get update && \
    apt-get install -y curl && \
    curl -sL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y nodejs ffmpeg

WORKDIR /home/app

# Copy the video processing script into container
COPY process.js .

RUN npm install @google-cloud/storage

CMD ["node", "process.js"]
