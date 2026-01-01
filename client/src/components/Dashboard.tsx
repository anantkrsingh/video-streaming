import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Logout, VideoLibrary, Upload } from '@mui/icons-material';

/**
 * Dashboard Component
 * Main dashboard page after user login
 * Displays user information and navigation options
 */
const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  /**
   * Handle logout
   */
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <Typography variant="h4" component="h1">
            Video Streaming Dashboard
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Logout />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>

        {/* User Info Card */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
              {user?.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h5">{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              <Typography variant="body2" color="primary">
                Role: {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Feature Cards */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Upload sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Typography variant="h6">Upload Videos</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Upload and manage your video content. Videos will be processed
                  for sensitivity analysis.
                </Typography>
                <Button variant="contained" onClick={() => navigate('/upload')}>
                  Upload Video
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <VideoLibrary sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Typography variant="h6">Video Library</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Browse and stream your uploaded videos. View processing status
                  and manage your content.
                </Typography>
                <Button variant="contained" onClick={() => navigate('/')}>
                  View Videos
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;

