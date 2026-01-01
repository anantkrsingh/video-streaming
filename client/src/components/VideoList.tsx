import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  TextField,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Button,
  InputAdornment,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Search,
  PlayArrow,
  MoreVert,
  Delete,
} from '@mui/icons-material';
import { getAllVideos, deleteVideo, type Video } from '../services/videoService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AvatarMenu from './AvatarMenu';

interface VideoListProps {
  organizationId?: string;
  organizationRole?: string; // User's role in the organization (owner, admin, editor, viewer)
  hideHeader?: boolean; // Hide AppBar when embedded in dashboard
}

/**
 * Video List Component
 * Displays all videos with search and filtering capabilities
 */
const VideoList: React.FC<VideoListProps> = ({ organizationId, organizationRole, hideHeader = false }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch videos
  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await getAllVideos(searchQuery, undefined, page, 12, organizationId);
      setVideos(response.data.videos);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [page, organizationId]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchVideos();
      } else {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, video: Video) => {
    setAnchorEl(event.currentTarget);
    setSelectedVideo(video);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVideo(null);
  };

  const handleDelete = async () => {
    if (!selectedVideo) return;

    try {
      await deleteVideo(selectedVideo._id);
      fetchVideos();
      handleMenuClose();
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Uploaded':
        return 'success';
      case 'Processing':
        return 'info';
      case 'Uploading':
        return 'warning';
      case 'Flagged':
        return 'error';
      default:
        return 'default';
    }
  };

  // Check if user can manage videos (based on org role or global role)
  const canManageVideos = organizationRole 
    ? ['owner', 'admin', 'editor'].includes(organizationRole)
    : (user?.role === 'editor' || user?.role === 'admin');

  return (
    <Box>
      {/* Only show AppBar when not embedded in a dashboard */}
      {!hideHeader && (
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Video Streaming
            </Typography>
            <AvatarMenu />
          </Toolbar>
        </AppBar>
      )}

      <Container maxWidth="xl" sx={{ mt: hideHeader ? 0 : 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Videos</Typography>
          {/* Only show upload button on main page, not in org dashboard */}
          {!organizationId && canManageVideos && (
            <Button
              variant="contained"
              onClick={() => navigate('/upload')}
            >
              Upload Video
            </Button>
          )}
        </Box>

      {/* Search Bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search videos..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Video Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : videos.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No videos found
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {videos.map((video) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={video._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="div"
                      sx={{
                        height: 200,
                        backgroundColor: 'grey.300',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <PlayArrow sx={{ fontSize: 60, color: 'grey.500' }} />
                      )}
                      <Chip
                        label={video.status}
                        color={getStatusColor(video.status) as any}
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                        }}
                      />
                      {/* Show action menu if user can manage or is the uploader */}
                      {(canManageVideos || user?.id === video.uploadedBy._id) && (
                        <IconButton
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          }}
                          size="small"
                          onClick={(e) => handleMenuOpen(e, video)}
                        >
                          <MoreVert />
                        </IconButton>
                      )}
                    </CardMedia>
                  </Box>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" noWrap gutterBottom>
                      {video.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {video.description || 'No description'}
                    </Typography>
                    {video.tags.length > 0 && (
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {video.tags.slice(0, 3).map((tag) => (
                          <Chip key={tag} label={tag} size="small" />
                        ))}
                      </Box>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      By {video.uploadedBy.name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, gap: 1 }}>
              <Button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Typography sx={{ alignSelf: 'center' }}>
                Page {page} of {totalPages}
              </Typography>
              <Button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDelete}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
        </Menu>
      </Container>
    </Box>
  );
};

export default VideoList;

