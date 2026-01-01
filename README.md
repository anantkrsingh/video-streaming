# Video Streaming Platform

A full-stack video streaming application with video upload, processing, and real-time progress tracking. Built with React, Node.js, and Google Cloud Platform.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Network                          │
│                                                                 │
│  ┌──────────────────────┐      ┌──────────────────────────┐    │
│  │   Client (nginx)     │      │    Server (Node.js)      │    │
│  │   Port: 3001         │      │    Port: 3000            │    │
│  │                      │      │                          │    │
│  │  ┌────────────────┐  │      │  ┌────────────────────┐  │    │
│  │  │  React + Vite  │  │ ───► │  │  Express API       │  │    │
│  │  │  (Static Build)│  │ /api │  │  + Socket.io       │  │    │
│  │  └────────────────┘  │      │  └────────────────────┘  │    │
│  │                      │      │           │              │    │
│  │  nginx reverse proxy │      │           ▼              │    │
│  │  - /api → server     │      │  ┌────────────────────┐  │    │
│  │  - /socket.io → ws   │      │  │  MongoDB           │  │    │
│  └──────────────────────┘      │  │  (External)        │  │    │
│                                │  └────────────────────┘  │    │
│                                │           │              │    │
│                                │           ▼              │    │
│                                │  ┌────────────────────┐  │    │
│                                │  │  Google Cloud      │  │    │
│                                │  │  Storage (GCS)     │  │    │
│                                │  └────────────────────┘  │    │
│                                └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Features

- **Video Upload**: Upload videos with real-time progress tracking
- **Video Processing**: Automatic video transcoding and HLS streaming
- **Thumbnail Generation**: Auto-generated thumbnails using FFmpeg
- **User Authentication**: JWT-based auth with Google OAuth support
- **Organization Management**: Multi-tenant architecture with role-based access
- **Real-time Updates**: Socket.io for live progress notifications
- **Responsive UI**: Material UI design system

## 📋 Prerequisites

- Docker & Docker Compose
- MongoDB (local or Atlas)
- Google Cloud Platform account with:
  - Cloud Storage bucket
  - Service account with Storage permissions
  - OAuth 2.0 credentials

## 🐳 Quick Start with Docker

### 1. Clone and Configure

```bash
# Create .env file in project root
cat > .env << EOF
# MongoDB
MONGODB_URI=mongodb://your-mongodb-host:27017/video-streaming

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key
PROCESSING_JWT_SECRET=your-processing-jwt-secret

# Google Cloud Platform
GCP_BUCKET_NAME=your-gcs-bucket-name
GCP_PROJECT_ID=your-gcp-project-id
GCP_SERVICE_ACCOUNT='{"type":"service_account",...}'  # JSON string of service account

# Google OAuth
GOOGLE_CLIENT_ID=your-google-oauth-client-id

# Optional
CLIENT_URL=http://localhost:3001
EOF
```

### 2. Build and Run

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 3. Access the Application

| Service        | URL                        | Description           |
| -------------- | -------------------------- | --------------------- |
| Frontend       | http://localhost:3001      | React application      |
| Backend API    | http://localhost:3000/api  | REST API endpoints    |
| API via Proxy  | http://localhost:3001/api  | Nginx proxied API     |

## 🛠️ Local Development

### Backend Setup

```bash
cd server
npm install
cp .env.example .env  # Configure environment variables
npm start             # Starts with nodemon on port 3000
```

### Frontend Setup

```bash
cd client
npm install
npm run dev           # Starts Vite dev server on port 5173
```

## 📁 Project Structure

```
video-streaming/
├── docker-compose.yaml       # Docker orchestration
├── .env                      # Environment variables (create this)
│
├── client/                   # Frontend (React + TypeScript + Vite)
│   ├── Dockerfile           # Multi-stage build with nginx
│   ├── nginx.conf           # Nginx configuration
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # Auth & Socket contexts
│   │   └── services/        # API services
│   └── package.json
│
├── server/                   # Backend (Node.js + Express)
│   ├── Dockerfile           # Node.js with FFmpeg
│   ├── controllers/         # Route handlers
│   ├── models/              # MongoDB schemas
│   ├── routes/              # API routes
│   ├── middleware/          # Auth & error handling
│   ├── workers/             # Background processors
│   └── package.json
│
└── server/video-processor/   # Cloud Run processor (optional)
    ├── Dockerfile
    └── process.js
```

## 🔌 API Endpoints

### Authentication

| Method | Endpoint              | Description              |
| ------ | --------------------- | ------------------------ |
| POST   | `/api/auth/register`  | Register new user        |
| POST   | `/api/auth/login`     | Login with email/password|
| POST   | `/api/auth/google`    | Login with Google OAuth  |
| GET    | `/api/auth/me`        | Get current user         |

### Videos

| Method | Endpoint                  | Description      |
| ------ | ------------------------- | ---------------- |
| GET    | `/api/videos`             | List all videos  |
| POST   | `/api/videos/upload`      | Upload a video   |
| GET    | `/api/videos/:id`         | Get video details|
| GET    | `/api/videos/:id/stream`  | Stream video     |

### Organizations

| Method | Endpoint                              | Description           |
| ------ | ------------------------------------- | --------------------- |
| POST   | `/api/organizations`                  | Create organization   |
| GET    | `/api/organizations/:id`              | Get organization      |
| POST   | `/api/organizations/:id/members`       | Add member            |

## 👥 User Roles

| Role     | Permissions                              |
| -------- | ---------------------------------------- |
| **Viewer** | Watch videos, view content               |
| **Editor** | Upload, edit, manage videos              |
| **Admin**  | Full access + user management            |
| **Owner**  | Organization owner, all permissions      |

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Google OAuth 2.0 integration
- Role-based access control (RBAC)
- Organization-level permissions
- Input validation
- CORS configuration
- Secure file upload handling

## 🐳 Docker Services

### Server Container

- **Base**: Node.js 20 Alpine
- **Includes**: FFmpeg for thumbnail generation
- **Port**: 3000 (internal & external)
- **Health Check**: HTTP GET on `/`

### Client Container

- **Build Stage**: Node.js 20 Alpine (builds React app)
- **Production Stage**: Nginx Alpine (serves static files)
- **Port**: 3001
- **Features**:
  - Reverse proxy to backend (`/api`, `/socket.io`)
  - Gzip compression
  - SPA routing support
  - 500MB upload limit

## 📝 Environment Variables

| Variable                  | Description                        | Required |
| ------------------------- | ---------------------------------- | -------- |
| `MONGODB_URI`             | MongoDB connection string          | Yes      |
| `JWT_SECRET`              | JWT signing secret                 | Yes      |
| `PROCESSING_JWT_SECRET`   | Processing token secret            | Yes      |
| `GCP_BUCKET_NAME`         | GCS bucket name                    | Yes      |
| `GCP_PROJECT_ID`          | GCP project ID                     | Yes      |
| `GCP_SERVICE_ACCOUNT`     | Service account JSON string        | Yes      |
| `GOOGLE_CLIENT_ID`        | Google OAuth client ID             | Yes      |
| `CLIENT_URL`              | Frontend URL for CORS              | No       |

> **Note**: `CLIENT_URL` defaults to `http://localhost:3001` if not provided.

## 🚧 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs server
docker-compose logs client

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

### API connection issues

- Ensure MongoDB is accessible from Docker network
- Check `MONGODB_URI` uses correct hostname (not `localhost` if external)
- Verify GCP credentials are valid

### Upload failures

- Check GCS bucket permissions
- Verify service account has Storage Object Admin role
- Check nginx `client_max_body_size` (default: 500MB)

## 📄 License

MIT
