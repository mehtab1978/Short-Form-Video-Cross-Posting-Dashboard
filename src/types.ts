export interface QueueItem {
  id: string;
  originalName: string;
  filename: string;
  caption: string;
  size: number;
  platforms: {
    youtube: boolean;
    instagram: boolean;
    facebook: boolean;
  };
  status: {
    youtube: 'idle' | 'pending' | 'processing' | 'published' | 'failed';
    instagram: 'idle' | 'pending' | 'processing' | 'published' | 'failed';
    facebook: 'idle' | 'pending' | 'processing' | 'published' | 'failed';
  };
  errors: {
    youtube?: string;
    instagram?: string;
    facebook?: string;
  };
  scheduledFor: string; // ISO format
  createdAt: string; // ISO format
  publishedAt?: {
    youtube?: string;
    instagram?: string;
    facebook?: string;
  };
}

export interface DailyStats {
  youtubeCount: number;
  metaCount: number; // Combined Facebook & Instagram
  youtubeLimit: number; // 100
  metaLimit: number; // 30
}

export interface AppConfig {
  hasYoutubeCredentials: boolean;
  hasMetaCredentials: boolean;
}
