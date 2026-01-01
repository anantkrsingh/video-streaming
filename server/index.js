const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
require("./workers/video-processor");

// Import routes
const authRoutes = require("./routes/authRoutes");
const videoRoutes = require("./routes/videoRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
// Import error handling middleware
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Initialize Express app
const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make Socket.io instance available to routes
app.set("io", io);

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Join room for specific video progress tracking
  socket.on("join-video-room", (videoId) => {
    const roomId = `video-${videoId}`;
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room: ${roomId}`);
  });

  // Leave room
  socket.on("leave-video-room", (videoId) => {
    const roomId = `video-${videoId}`;
    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room: ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

/**
 * Middleware Configuration
 */

// Enable CORS (Cross-Origin Resource Sharing)
// Allows frontend to make requests to backend API
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173", // Vite default port
    credentials: true, // Allow cookies/credentials
  })
);

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

/**
 * API Routes
 */

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Video Streaming API is running",
    version: "1.0.0",
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Organization routes
app.use("/api/organizations", organizationRoutes);

// Video routes
app.use("/api/videos", videoRoutes);

/**
 * Error Handling
 */

// Handle 404 - Route not found
app.use(notFound);

// Global error handler (must be last middleware)
app.use(errorHandler);

/**
 * Database Connection and Server Startup
 */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    
    // Start server after successful database connection
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`API endpoint: http://localhost:${port}/api`);
      console.log(`Socket.io server initialized`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit process if database connection fails
  });

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  process.exit(1);
});

module.exports = app;
