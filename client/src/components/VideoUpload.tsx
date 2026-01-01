import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
  Chip,
  IconButton,
} from '@mui/material';
import { CloudUpload, Close } from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';
import { uploadVideo } from '../services/videoService';
import { useNavigate } from 'react-router-dom';

interface VideoUploadProps {
  organizationId?: string;
}

/**
 * Video Upload Component
 * Handles video upload with real-time progress tracking
 * Shows two phases: HTTP upload (client->server) and GCS upload (server->cloud)
 */
const VideoUpload: React.FC<VideoUploadProps> = ({ organizationId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [httpProgress, setHttpProgress] = useState(0); // Client -> Server progress
  const [gcsProgress, setGcsProgress] = useState(0); // Server -> Cloud progress
  const [status, setStatus] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);

  const { socket } = useSocket();
  const navigate = useNavigate();

  // Combined progress: HTTP upload (0-50%) + GCS upload (50-100%)
  const totalProgress = status === 'Uploading to server' 
    ? Math.round(httpProgress * 0.5) 
    : status === 'Uploading' 
      ? 50 + Math.round(gcsProgress * 0.5)
      : status === 'Processing' || status === 'Uploaded'
        ? 100
        : 0;

  // Listen for upload progress updates from server (GCS upload)
  useEffect(() => {
    if (!socket || !videoId) return;

    // Join the video room to receive progress updates
    socket.emit('join-video-room', videoId);
    console.log('Joined room for video:', videoId);

    socket.on('upload-progress', (data: { videoId: string; progress: number; status: string }) => {
      if (data.videoId === videoId) {
        console.log('GCS upload progress:', data.progress);
        setGcsProgress(data.progress);
        setStatus('Uploading');
        setStatusMessage(`Uploading to cloud: ${data.progress}%`);
      }
    });

    socket.on('upload-complete', (data: { videoId: string; status: string }) => {
      if (data.videoId === videoId) {
        console.log('Upload complete');
        setStatus('Processing');
        setStatusMessage('Processing video...');
        setGcsProgress(100);
      }
    });

    socket.on('processing-complete', (data: { videoId: string; status: string }) => {
      if (data.videoId === videoId) {
        console.log('Processing complete');
        setStatus('Uploaded');
        setStatusMessage('Upload complete!');
        setTimeout(() => {
          if (organizationId) {
            navigate(`/dashboard/${organizationId}`);
          } else {
            navigate('/');
          }
        }, 2000);
      }
    });

    socket.on('upload-error', (data: { videoId: string; error: string }) => {
      if (data.videoId === videoId) {
        setError(data.error);
        setLoading(false);
        setStatus('');
      }
    });

    socket.on('thumbnail-generated', (data: { videoId: string; thumbnailUrl: string }) => {
      if (data.videoId === videoId) {
        console.log('Thumbnail generated:', data.thumbnailUrl);
      }
    });

    return () => {
      socket.emit('leave-video-room', videoId);
      socket.off('upload-progress');
      socket.off('upload-complete');
      socket.off('processing-complete');
      socket.off('upload-error');
      socket.off('thumbnail-generated');
    };
  }, [socket, videoId, navigate, organizationId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        setError('File size must be less than 500MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setHttpProgress(0);
    setGcsProgress(0);
    setStatus('Uploading to server');
    setStatusMessage('Uploading to server: 0%');

    if (!title.trim()) {
      setError('Title is required');
      setLoading(false);
      setStatus('');
      return;
    }

    if (!selectedFile) {
      setError('Please select a video file');
      setLoading(false);
      setStatus('');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('title', title);
      if (description) formData.append('description', description);
      if (tags.length > 0) formData.append('tags', JSON.stringify(tags));
      if (organizationId) formData.append('organizationId', organizationId);

      // Upload with HTTP progress tracking
      const response = await uploadVideo(formData, (progress) => {
        setHttpProgress(progress);
        setStatusMessage(`Uploading to server: ${progress}%`);
      });

      // Got videoId, now socket will receive GCS progress
      setVideoId(response.data.video.id);
      setStatus('Uploading');
      setStatusMessage('Preparing cloud upload...');
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Upload Video
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            disabled={loading || status === 'Processing' || status === 'Uploaded'}
          />

          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            disabled={loading || status === 'Processing' || status === 'Uploaded'}
          />

          <Box sx={{ mt: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="Add Tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                disabled={loading || status === 'Processing' || status === 'Uploaded'}
                size="small"
              />
              <Button
                onClick={handleAddTag}
                variant="outlined"
                disabled={loading || status === 'Processing' || status === 'Uploaded'}
              >
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  disabled={loading || status === 'Processing' || status === 'Uploaded'}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ mt: 2, mb: 2 }}>
            <input
              accept="video/*"
              style={{ display: 'none' }}
              id="video-upload"
              type="file"
              onChange={handleFileSelect}
              disabled={loading || status === 'Processing' || status === 'Uploaded'}
            />
            <label htmlFor="video-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUpload />}
                disabled={loading || status === 'Processing' || status === 'Uploaded'}
                fullWidth
                sx={{ mb: 2 }}
              >
                {selectedFile ? selectedFile.name : 'Select Video File'}
              </Button>
            </label>
            {selectedFile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedFile(null);
                    setHttpProgress(0);
                    setGcsProgress(0);
                    setStatus('');
                    setStatusMessage('');
                    setVideoId(null);
                  }}
                  disabled={loading || status === 'Processing' || status === 'Uploaded'}
                >
                  <Close />
                </IconButton>
              </Box>
            )}
          </Box>

          {/* Progress Section */}
          {(status === 'Uploading to server' || status === 'Uploading' || status === 'Processing') && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 'medium' }}>
                {statusMessage}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={totalProgress} 
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Overall progress: {totalProgress}%
              </Typography>
            </Box>
          )}

          {status === 'Uploaded' && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Video uploaded successfully! Redirecting...
            </Alert>
          )}

          {/* Error from socket */}
          {status === '' && error && loading === false && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3 }}
            disabled={loading || !selectedFile || status !== ''}
          >
            {loading ? 'Uploading...' : 'Upload Video'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default VideoUpload;

