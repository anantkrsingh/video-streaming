import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  Fullscreen,
} from '@mui/icons-material';
import { getVideoById, type Video } from '../services/videoService';
import { useAuth } from '../contexts/AuthContext';
import AvatarMenu from './AvatarMenu';

/**
 * Video Player Component
 * Plays video using HLS.js for adaptive streaming
 * Falls back to native video for non-HLS sources
 * Works for both authenticated and unauthenticated users (public route)
 */
const VideoPlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { user } = useAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Fetch video details
  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return;

      try {
        setLoading(true);
        // Use public API when user is not logged in
        const isPublic = !user;
        const response = await getVideoById(id, isPublic);
        setVideo(response.data.video);
      } catch (err: any) {
        console.error('Error fetching video:', err);
        setError(err.response?.data?.message || 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id, user]);

  // Initialize HLS player
  useEffect(() => {
    if (!video || !videoRef.current) return;

    const videoElement = videoRef.current;
    const videoSource = video.hlsUrl || video.videoUrl || video.rawView;

    if (!videoSource) {
      setError('No video source available');
      return;
    }

    // Check if it's an HLS stream
    const isHls = videoSource.endsWith('.m3u8');

    if (isHls && Hls.isSupported()) {
      // Use HLS.js for HLS streams
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(videoSource);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest loaded');
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              setError('Failed to load video stream');
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl') && isHls) {
      // Native HLS support (Safari)
      videoElement.src = videoSource;
    } else {
      // Regular video (MP4, WebM, etc.)
      videoElement.src = videoSource;
    }

    // Event listeners
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(videoElement.currentTime);
    const handleLoadedMetadata = () => setDuration(videoElement.duration);

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !video) {
    return (
      <Box>
        <AppBar position="static">
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Video Player
            </Typography>
            <AvatarMenu />
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Alert severity="error">{error || 'Video not found'}</Alert>
        </Container>
      </Box>
    );
  }

  const videoSource = video.hlsUrl || video.videoUrl || video.rawView;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a' }}>
      <AppBar position="static" sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }} noWrap>
            {video.title}
          </Typography>
          <AvatarMenu />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 2 }}>
        {/* Video Player */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: '#000',
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative',
            aspectRatio: '16/9',
            mb: 3,
          }}
        >
          {videoSource ? (
            <>
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
                poster={video.thumbnailUrl || undefined}
                onClick={togglePlay}
                playsInline
              />

              {/* Custom Controls */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                  p: 2,
                }}
              >
                {/* Progress Bar */}
                <Box sx={{ mb: 1 }}>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    style={{
                      width: '100%',
                      height: 4,
                      cursor: 'pointer',
                      accentColor: '#1976d2',
                    }}
                  />
                </Box>

                {/* Control Buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton onClick={togglePlay} sx={{ color: 'white' }}>
                    {isPlaying ? <Pause /> : <PlayArrow />}
                  </IconButton>
                  <IconButton onClick={toggleMute} sx={{ color: 'white' }}>
                    {isMuted ? <VolumeOff /> : <VolumeUp />}
                  </IconButton>
                  <Typography variant="body2" sx={{ color: 'white', ml: 1 }}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
                    <Fullscreen />
                  </IconButton>
                </Box>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'white',
              }}
            >
              <Typography>Video is still processing...</Typography>
            </Box>
          )}
        </Paper>

        {/* Video Info */}
        <Paper sx={{ p: 3, bgcolor: '#1a1a1a', color: 'white' }}>
          <Typography variant="h5" gutterBottom>
            {video.title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="grey.400">
              By {video.uploadedBy?.name || 'Unknown'}
            </Typography>
            <Chip
              label={video.status}
              size="small"
              color={video.status === 'Uploaded' ? 'success' : 'default'}
            />
            {video.metadata?.duration && (
              <Typography variant="body2" color="grey.400">
                Duration: {formatTime(video.metadata.duration)}
              </Typography>
            )}
          </Box>

          {video.description && (
            <>
              <Divider sx={{ my: 2, borderColor: 'grey.800' }} />
              <Typography variant="body1" color="grey.300">
                {video.description}
              </Typography>
            </>
          )}

          {video.tags && video.tags.length > 0 && (
            <>
              <Divider sx={{ my: 2, borderColor: 'grey.800' }} />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {video.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{ bgcolor: 'grey.800', color: 'white' }}
                  />
                ))}
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default VideoPlayer;

