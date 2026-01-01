import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import VideoList from './components/VideoList';
import VideoUpload from './components/VideoUpload';
import VideoPlayer from './components/VideoPlayer';
import OrganizationDashboard from './components/OrganizationDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

/**
 * Material UI Theme Configuration
 * Custom theme for the application
 */
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

/**
 * Main App Component
 * Sets up routing, authentication context, Google OAuth, and Material UI theme
 */
function App() {
  // Get Google Client ID from environment variables
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <SocketProvider>
            <Router>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                {/* Public Route - Video listing */}
                <Route
                  path="/"
                  element={<VideoList isPublic={true} />}
                />
                <Route
                  path="/upload"
                  element={
                    <ProtectedRoute>
                      <VideoUpload />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/:organizationId"
                  element={
                    <ProtectedRoute>
                      <OrganizationDashboard />
                    </ProtectedRoute>
                  }
                />
                {/* Public Route - Video player */}
                <Route
                  path="/video/:id"
                  element={<VideoPlayer />}
                />
                
                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
