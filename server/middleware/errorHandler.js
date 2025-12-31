/**
 * Error Handling Middleware
 * Centralized error handling for the application
 * Provides consistent error response format
 */

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 * Catches all errors and sends appropriate response
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorHandler = (err, req, res, next) => {
  // Set default error status code
  let statusCode = err.statusCode || 500;

  // Set default error message
  let message = err.message || "Internal Server Error";

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = `Validation Error: ${errors.join(", ")}`;
  }

  // Handle Mongoose duplicate key errors (e.g., duplicate email)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format.";
  }

  // Log error for debugging (in production, use proper logging service)
  console.error("Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * 404 Not Found handler
 * Catches requests to non-existent routes
 */
const notFound = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404
  );
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  notFound,
};

