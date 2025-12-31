# Video Streaming Application

A comprehensive full-stack application for video upload, sensitivity processing, and streaming with real-time progress tracking.

## 🚀 Features

- **User Authentication**: Secure login and registration system with JWT tokens
- **Role-Based Access Control (RBAC)**: Three user roles (Viewer, Editor, Admin)
- **Multi-Tenant Architecture**: User data isolation and organization support
- **Material UI Design**: Modern, responsive user interface
- **RESTful API**: Clean backend architecture following MVM pattern

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## 🛠️ Installation

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `server` directory:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/video-streaming
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

5. Start the backend server:
```bash
npm start
```

The server will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `client` directory:
```bash
cp .env.example .env
```

4. Update the `.env` file:
```env
VITE_API_URL=http://localhost:3000/api
```

5. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## 📁 Project Structure

```
video-streaming/
├── server/                 # Backend application
│   ├── models/            # MongoDB models (MVM - Model)
│   │   └── User.js        # User model with RBAC
│   ├── controllers/       # Route controllers (MVM - Controller)
│   │   └── authController.js
│   ├── routes/            # API routes (MVM - Router)
│   │   └── authRoutes.js
│   ├── middleware/        # Express middleware
│   │   ├── auth.js        # Authentication & authorization
│   │   └── errorHandler.js
│   └── index.js           # Server entry point
│
└── client/                # Frontend application
    └── src/
        ├── components/    # React components
        │   ├── Login.tsx
        │   ├── Register.tsx
        │   ├── Dashboard.tsx
        │   └── ProtectedRoute.tsx
        ├── contexts/      # React contexts
        │   └── AuthContext.tsx
        ├── services/      # API services
        │   ├── api.ts
        │   └── authService.ts
        └── App.tsx        # Main app component
```

## 🔐 Authentication API Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "viewer"  // optional: viewer, editor, admin
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer <token>
```

## 👥 User Roles

- **Viewer**: Read-only access to assigned videos
- **Editor**: Upload, edit, and manage video content
- **Admin**: Full system access including user management

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT token-based authentication
- Protected routes with authentication middleware
- Role-based access control (RBAC)
- Input validation with express-validator
- CORS configuration
- Error handling middleware

## 🎨 UI Components

- **Login Page**: User authentication interface
- **Register Page**: New user registration with role selection
- **Dashboard**: Main dashboard after login with user info
- **Protected Routes**: Automatic redirect to login for unauthenticated users

## 📝 Notes

- Passwords are automatically hashed before storage
- JWT tokens expire after 7 days (configurable)
- All API endpoints require authentication except `/api/auth/register` and `/api/auth/login`
- User data is isolated by organization ID for multi-tenant support

## 🚧 Next Steps

The following features are planned for future implementation:
- Video upload functionality
- Video processing pipeline
- Real-time progress updates with Socket.io
- Video streaming with range requests
- Video library and management
- Content sensitivity analysis

## 📄 License

MIT

