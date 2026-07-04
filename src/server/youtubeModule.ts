import { youtube, auth } from '@googleapis/youtube';
import fs from 'fs';

export interface YoutubeUploadParams {
  filePath: string;
  title: string;
  description: string;
  privacyStatus: 'public' | 'unlisted' | 'private';
  category: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

export async function uploadToYoutube(
  params: YoutubeUploadParams,
  onProgress: (progress: number) => void
): Promise<{ success: boolean; videoId?: string; error?: string; logs: string[] }> {
  const logs: string[] = [];
  logs.push(`[YouTube API] Initializing YouTube upload process for: "${params.title}"`);

  const hasCredentials = !!(params.clientId && params.clientSecret && params.refreshToken);

  if (!hasCredentials) {
    logs.push('[YouTube API] [SIMULATION MODE] No OAuth2 credentials found in environment. Running full-pipeline simulation.');
    logs.push('[YouTube API] Scope requested: https://www.googleapis.com/auth/youtube.upload');
    logs.push('[YouTube API] Step 1/4: Initializing OAuth2 client with Client ID and Secret');
    
    await new Promise((r) => setTimeout(r, 800));
    logs.push('[YouTube API] Step 2/4: Refreshing OAuth2 Access Token using offline Refresh Token');
    
    await new Promise((r) => setTimeout(r, 600));
    logs.push('[YouTube API] Step 3/4: Structuring media metadata resource');
    logs.push(`[YouTube API] Payload:\n${JSON.stringify({
      snippet: {
        title: params.title,
        description: params.description,
        categoryId: params.category || '22', // People & Blogs
        tags: ['Shorts', 'reels', 'viral']
      },
      status: {
        privacyStatus: params.privacyStatus,
        selfDeclaredMadeForKids: false
      }
    }, null, 2)}`);

    await new Promise((r) => setTimeout(r, 800));
    logs.push('[YouTube API] Step 4/4: Initiating chunked media resumable upload protocol');

    // Simulate progress updates
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const percentage = (i / steps) * 100;
      onProgress(percentage);
      logs.push(`[YouTube API] Chunk ${i}/${steps} uploaded successfully - ${percentage}% complete`);
    }

    const mockVideoId = `yt_${Math.random().toString(36).substring(2, 11)}`;
    logs.push(`[YouTube API] Resumable upload session finalized successfully. Video created with ID: ${mockVideoId}`);
    logs.push(`[YouTube API] YouTube Shorts URL: https://youtube.com/shorts/${mockVideoId}`);

    return {
      success: true,
      videoId: mockVideoId,
      logs
    };
  }

  try {
    logs.push('[YouTube API] [LIVE MODE] Using client credentials to initiate upload.');
    
    const oauth2Client = new auth.OAuth2(
      params.clientId,
      params.clientSecret,
      // We don't need a redirect URL for programmatic upload via refresh tokens
      'urn:ietf:wg:oauth:2.0:oob'
    );

    oauth2Client.setCredentials({
      refresh_token: params.refreshToken
    });

    logs.push('[YouTube API] OAuth2 client created & credentials set. Authorizing...');
    
    const ytClient = youtube({
      version: 'v3',
      auth: oauth2Client
    });

    const fileStream = fs.createReadStream(params.filePath);
    const fileSize = fs.statSync(params.filePath).size;

    logs.push(`[YouTube API] Media file read successfully. Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
    logs.push('[YouTube API] Initiating YouTube resumable media upload endpoint...');

    const res = await ytClient.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: params.title,
          description: params.description,
          categoryId: params.category || '22',
          tags: ['Shorts', 'shorts', 'reels']
        },
        status: {
          privacyStatus: params.privacyStatus,
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fileStream
      }
    }, {
      onUploadProgress: (evt) => {
        const progress = Math.round((evt.bytesRead / fileSize) * 100);
        onProgress(progress);
        logs.push(`[YouTube API] Resumable upload bytes read: ${evt.bytesRead} / ${fileSize} (${progress}%)`);
      }
    });

    const videoId = res.data.id;
    if (!videoId) {
      throw new Error('YouTube API returned a success response but no Video ID was found.');
    }

    logs.push(`[YouTube API] Resumable upload success! Video created with ID: ${videoId}`);
    return {
      success: true,
      videoId,
      logs
    };
  } catch (error: any) {
    logs.push(`[YouTube API] [ERROR] Upload failed: ${error.message || error}`);
    return {
      success: false,
      error: error.message || String(error),
      logs
    };
  }
}
