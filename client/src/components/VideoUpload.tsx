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
  const [processingProgress, setProcessingProgress] = useState(0); // Video processing progress
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);

  const { socket } = useSocket();

  // Combined upload progress: HTTP upload (0-50%) + GCS upload (50-100%)
  const uploadProgress = status === 'Uploading to server' 
    ? Math.round(httpProgress * 0.5) 
    : status === 'Uploading' 
      ? 50 + Math.round(gcsProgress * 0.5)
      : 100;

  // Listen for upload progress updates from server (GCS upload)
  useEffect(() => {
    if (!socket || !videoId) return;

    // Join the video room to receive progress updates
    socket.emit('join-video-room', videoId);
    console.log('Joined room for video:', videoId);

    socket.on('upload-progress', (data: { videoId: string; progress: number; status: string }) => {
      if (String(data.videoId) === String(videoId)) {
        console.log('GCS upload progress:', data.progress);
        setGcsProgress(data.progress);
        // Don't reset status if progress is 100% (let upload-complete handle the transition)
        if (data.progress < 100) {
          setStatus('Uploading');
        }
      }
    });

    socket.on('upload-complete', (data: { videoId: string; status: string }) => {
      if (String(data.videoId) === String(videoId)) {
        console.log('Upload complete, starting processing...');
        setStatus('Processing');
        setGcsProgress(100);
        setProcessingProgress(0);
      }
    });

    // Listen for video processing progress from Cloud Run container
    socket.on('processing-progress', (data: { videoId: string; progress: number; stage: string }) => {
      if (String(data.videoId) === String(videoId)) {
        console.log('Processing progress:', data.progress, '- Stage:', data.stage);
        setProcessingProgress(Math.max(data.progress, processingProgress));
        // Also ensure status is set to Processing (fallback if upload-complete was missed)
        setStatus('Processing');
      }
    });

    socket.on('processing-complete', (data: { videoId: string; status: string }) => {
      if (String(data.videoId) === String(videoId)) {
        console.log('Processing complete');
        setStatus('Uploaded');
        setProcessingProgress(100);
        setLoading(false);
      }
    });

    socket.on('processing-failed', (data: { videoId: string; error: string }) => {
      if (String(data.videoId) === String(videoId)) {
        console.log('Processing failed:', data.error);
        setError(`Processing failed: ${data.error}`);
        setLoading(false);
        setStatus('');
      }
    });

    socket.on('upload-error', (data: { videoId: string; error: string }) => {
      if (String(data.videoId) === String(videoId)) {
        setError(data.error);
        setLoading(false);
        setStatus('');
      }
    });

    socket.on('thumbnail-generated', (data: { videoId: string; thumbnailUrl: string }) => {
      if (String(data.videoId) === String(videoId)) {
        console.log('Thumbnail generated:', data.thumbnailUrl);
      }
    });

    return () => {
      socket.emit('leave-video-room', videoId);
      socket.off('upload-progress');
      socket.off('upload-complete');
      socket.off('processing-progress');
      socket.off('processing-complete');
      socket.off('processing-failed');
      socket.off('upload-error');
      socket.off('thumbnail-generated');
    };
  }, [socket, videoId]);

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
      });

      // Got videoId, now socket will receive GCS progress
      setVideoId(response.data.video.id);
      setStatus('Uploading');
      
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
                    setProcessingProgress(0);
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

          {/* Upload Progress */}
          {(status === 'Uploading to server' || status === 'Uploading') && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 'medium' }}>
                Uploading {uploadProgress}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
          )}

          {/* Processing Progress */}
          {status === 'Processing' && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 'medium' }}>
                Processing {processingProgress}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={processingProgress} 
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
          )}

          {status === 'Uploaded' && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Upload Complete
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

