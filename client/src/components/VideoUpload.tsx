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
 */
const VideoUpload: React.FC<VideoUploadProps> = ({ organizationId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);

  const { socket } = useSocket();
  const navigate = useNavigate();

  // Listen for upload progress updates
  useEffect(() => {
    if (!socket || !videoId) return;

    const roomId = `video-${videoId}`;
    socket.emit('join-video-room', videoId);

    socket.on('upload-progress', (data: { videoId: string; progress: number; status: string }) => {
      if (data.videoId === videoId) {
        setUploadProgress(data.progress);
        setStatus(data.status);
      }
    });

    socket.on('upload-complete', (data: { videoId: string; status: string }) => {
      if (data.videoId === videoId) {
        setStatus('Processing');
        setUploadProgress(100);
      }
    });

    socket.on('processing-complete', (data: { videoId: string; status: string }) => {
      if (data.videoId === videoId) {
        setStatus('Uploaded');
        setTimeout(() => {
          navigate('/');
        }, 2000);
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
      socket.off('thumbnail-generated');
    };
  }, [socket, videoId, navigate]);

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

    if (!title.trim()) {
      setError('Title is required');
      setLoading(false);
      return;
    }

    if (!selectedFile) {
      setError('Please select a video file');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('title', title);
      if (description) formData.append('description', description);
      if (tags.length > 0) formData.append('tags', JSON.stringify(tags));
      if (organizationId) formData.append('organizationId', organizationId);

      const response = await uploadVideo(formData);
      setVideoId(response.data.video.id);
      setStatus(response.data.video.status);
      setUploadProgress(response.data.video.uploadProgress);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      setLoading(false);
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
                    setUploadProgress(0);
                    setStatus('');
                    setVideoId(null);
                  }}
                  disabled={loading || status === 'Processing' || status === 'Uploaded'}
                >
                  <Close />
                </IconButton>
              </Box>
            )}
          </Box>

          {(status === 'Uploading' || status === 'Processing') && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                {status}: {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          {status === 'Uploaded' && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Video uploaded successfully! Redirecting...
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3 }}
            disabled={loading || !selectedFile || status === 'Processing' || status === 'Uploaded'}
          >
            {loading ? 'Uploading...' : 'Upload Video'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default VideoUpload;

