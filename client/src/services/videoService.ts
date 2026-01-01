import api from './api';

/**
 * Video Service
 * Handles all video-related API calls
 */

export interface Video {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  rawFileName: string;
  status: 'Uploading' | 'Processing' | 'Flagged' | 'Uploaded' | 'Deleted' | 'Failed';
  flagReason?: 'Spam' | 'Nudity' | 'Violence' | 'Copyright' | 'Other';
  rawView?: string;
  videoUrl?: string;
  hlsUrl?: string;
  thumbnailUrl?: string;
  metadata?: {
    duration?: number;
    fileSize?: number;
    mimeType?: string;
    resolution?: {
      width?: number;
      height?: number;
    };
    codec?: {
      video?: string;
      audio?: string;
    };
  };
  uploadProgress: number;
  processingProgress: number;
  processingStage?: string;
  errorMessage?: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  organizationId?: string;
  uploadedAt: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoListResponse {
  success: boolean;
  data: {
    videos: Video[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface VideoResponse {
  success: boolean;
  data: {
    video: Video;
  };
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    video: {
      id: string;
      title: string;
      status: string;
      uploadProgress: number;
    };
    roomId: string;
  };
}

/**
 * Get all videos with search and filtering
 * Uses public endpoint when isPublic is true (no auth required)
 */
export const getAllVideos = async (
  search?: string,
  status?: string,
  page: number = 1,
  limit: number = 10,
  organizationId?: string,
  isPublic: boolean = false
): Promise<VideoListResponse> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (organizationId) params.append('organizationId', organizationId);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  // Use public endpoint for unauthenticated access
  const endpoint = isPublic ? '/videos/public' : '/videos';
  const response = await api.get<VideoListResponse>(`${endpoint}?${params.toString()}`);
  return response.data;
};

/**
 * Get single video by ID
 * Uses public endpoint when isPublic is true (no auth required)
 */
export const getVideoById = async (id: string, isPublic: boolean = false): Promise<VideoResponse> => {
  const endpoint = isPublic ? `/videos/public/${id}` : `/videos/${id}`;
  const response = await api.get<VideoResponse>(endpoint);
  return response.data;
};

/**
 * Upload video with progress tracking
 * @param formData - Form data containing video file and metadata
 * @param onUploadProgress - Callback for HTTP upload progress (client -> server)
 */
export const uploadVideo = async (
  formData: FormData,
  onUploadProgress?: (progress: number) => void
): Promise<UploadResponse> => {
  const response = await api.post<UploadResponse>('/videos/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onUploadProgress) {
        // HTTP upload progress (file going from client to server)
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(progress);
      }
    },
  });
  return response.data;
};

/**
 * Update video metadata
 */
export const updateVideo = async (
  id: string,
  data: {
    title?: string;
    description?: string;
    tags?: string[];
    thumbnailUrl?: string;
  }
): Promise<VideoResponse> => {
  const response = await api.put<VideoResponse>(`/videos/${id}`, data);
  return response.data;
};

/**
 * Upload thumbnail for video
 */
export const uploadThumbnail = async (
  id: string,
  thumbnailFile: File
): Promise<{ success: boolean; data: { thumbnailUrl: string } }> => {
  const formData = new FormData();
  formData.append('thumbnail', thumbnailFile);

  const response = await api.post(`/videos/${id}/thumbnail`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Delete video
 */
export const deleteVideo = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/videos/${id}`);
  return response.data;
};

