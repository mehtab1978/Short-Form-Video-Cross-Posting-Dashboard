import fs from 'fs';
import path from 'path';
import { QueueItem, DailyStats } from '../types';
import { uploadToYoutube } from './youtubeModule';
import { uploadToInstagramReels, uploadToFacebookReels } from './metaModule';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'queue.json');

// Memory cache + file lock simple structure
let queueCache: QueueItem[] = [];

// Ensure directory and file exist
function initializeDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify([], null, 2));
    }
    const data = fs.readFileSync(FILE_PATH, 'utf-8');
    queueCache = JSON.parse(data);
  } catch (err) {
    console.error('Error initializing database, using in-memory fallback:', err);
    queueCache = [];
  }
}

// Initialize immediately
initializeDB();

function saveDB() {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(queueCache, null, 2));
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

export function getQueue(): QueueItem[] {
  return queueCache;
}

export function clearQueue(): void {
  queueCache = [];
  saveDB();
}

export function deleteQueueItem(id: string): boolean {
  const index = queueCache.findIndex((item) => item.id === id);
  if (index !== -1) {
    const item = queueCache[index];
    // Delete physical file on disk if it exists
    if (item.filename) {
      const videoPath = path.join(process.cwd(), 'uploads', item.filename);
      if (fs.existsSync(videoPath)) {
        try {
          fs.unlinkSync(videoPath);
        } catch (e) {
          console.error(`Failed to delete file: ${videoPath}`, e);
        }
      }
    }
    queueCache.splice(index, 1);
    saveDB();
    return true;
  }
  return false;
}

export function get24HourStats(): DailyStats {
  const now = new Date();
  const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let youtubeCount = 0;
  let metaCount = 0;

  queueCache.forEach((item) => {
    const itemTime = new Date(item.scheduledFor);
    if (itemTime >= past24Hours) {
      // Check YouTube
      if (item.platforms.youtube) {
        // Only count if it's not idle or canceled
        if (item.status.youtube !== 'idle') {
          youtubeCount++;
        }
      }
      // Check Meta (Instagram & Facebook)
      let hasMeta = false;
      if (item.platforms.instagram && item.status.instagram !== 'idle') {
        metaCount++;
        hasMeta = true;
      }
      if (item.platforms.facebook && item.status.facebook !== 'idle') {
        metaCount++;
        hasMeta = true;
      }
    }
  });

  return {
    youtubeCount,
    metaCount,
    youtubeLimit: 100,
    metaLimit: 30,
  };
}

export interface AddItemInput {
  originalName: string;
  filename: string;
  caption: string;
  size: number;
  platforms: {
    youtube: boolean;
    instagram: boolean;
    facebook: boolean;
  };
  scheduledFor: string; // ISO String
}

export function addQueueItem(input: AddItemInput): QueueItem {
  const stats = get24HourStats();

  // 1. Enforce strict safety limits
  let requestedYoutube = input.platforms.youtube ? 1 : 0;
  let requestedMeta = (input.platforms.instagram ? 1 : 0) + (input.platforms.facebook ? 1 : 0);

  if (stats.youtubeCount + requestedYoutube > stats.youtubeLimit) {
    throw new Error(
      `Safety Limit Warning: Adding this item would exceed the 24-hour safety threshold of ${stats.youtubeLimit} uploads for the YouTube Data API. Current usage in past 24h: ${stats.youtubeCount}.`
    );
  }

  if (stats.metaCount + requestedMeta > stats.metaLimit) {
    throw new Error(
      `Safety Limit Warning: Adding this item would exceed the 24-hour safety threshold of ${stats.metaLimit} uploads for the Meta APIs (Instagram/Facebook combined). Current usage in past 24h: ${stats.metaCount}.`
    );
  }

  // 2. Queue pacing mechanism
  // If multiple videos are submitted or scheduled very close to each other, space them out.
  // We enforce a minimum interval of 5 minutes (300,000 ms) between scheduled times.
  const MIN_PACING_MS = 5 * 60 * 1000;
  let targetSchedule = new Date(input.scheduledFor);
  
  // Sort items in our current queue by scheduled date
  const sortedScheduledTimes = queueCache
    .map((item) => new Date(item.scheduledFor).getTime())
    .sort((a, b) => a - b);

  // We find if our proposed schedule conflicts with any other item's window
  for (const existingTimeMs of sortedScheduledTimes) {
    const diff = Math.abs(targetSchedule.getTime() - existingTimeMs);
    if (diff < MIN_PACING_MS) {
      // Conflict found! Push schedule forward to be exactly MIN_PACING_MS after this existing item
      targetSchedule = new Date(existingTimeMs + MIN_PACING_MS);
      console.log(`[Pacing Engine] Schedule collision detected. Auto-pacing item to: ${targetSchedule.toISOString()}`);
    }
  }

  const id = `item_${Math.random().toString(36).substring(2, 11)}`;
  
  const newItem: QueueItem = {
    id,
    originalName: input.originalName,
    filename: input.filename,
    caption: input.caption,
    size: input.size,
    platforms: input.platforms,
    status: {
      youtube: input.platforms.youtube ? 'pending' : 'idle',
      instagram: input.platforms.instagram ? 'pending' : 'idle',
      facebook: input.platforms.facebook ? 'pending' : 'idle',
    },
    errors: {},
    scheduledFor: targetSchedule.toISOString(),
    createdAt: new Date().toISOString(),
  };

  queueCache.push(newItem);
  saveDB();
  return newItem;
}

// In-memory active processing state to prevent double execution
const activeProcessingItems = new Set<string>();

// Global logs map for active logs queryable from frontend
export const jobLogs: Record<string, { percent: number; logs: string[] }> = {};

export async function processQueue() {
  const now = new Date();

  for (const item of queueCache) {
    // If the item is already being processed, skip
    if (activeProcessingItems.has(item.id)) {
      continue;
    }

    const scheduledTime = new Date(item.scheduledFor);
    // Is it time to publish? And does it have any pending platform?
    const hasPending = 
      item.status.youtube === 'pending' || 
      item.status.instagram === 'pending' || 
      item.status.facebook === 'pending';

    if (scheduledTime <= now && hasPending) {
      // Start processing!
      activeProcessingItems.add(item.id);
      
      // Initialize job tracking logs
      jobLogs[item.id] = { percent: 0, logs: ['[Scheduler] Initializing distribution job.'] };

      // Spawn distribution task asynchronously
      runDistribution(item).then(() => {
        activeProcessingItems.delete(item.id);
      }).catch((err) => {
        console.error(`Unhandled error distributing item ${item.id}:`, err);
        activeProcessingItems.delete(item.id);
      });
    }
  }
}

async function runDistribution(item: QueueItem) {
  const job = jobLogs[item.id];
  job.logs.push(`[Scheduler] Commencing distribution at ${new Date().toISOString()}`);

  const filePath = path.join(process.cwd(), 'uploads', item.filename);

  // We fetch credentials from environmental variables
  const youtubeClientId = process.env.YOUTUBE_CLIENT_ID;
  const youtubeClientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const youtubeRefreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  const instagramBusinessId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const facebookPageId = process.env.FACEBOOK_PAGE_ID;
  const metaAccessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  // 1. YouTube Shorts Upload
  if (item.status.youtube === 'pending') {
    item.status.youtube = 'processing';
    saveDB();
    job.logs.push('[YouTube] Commencing upload sequence.');

    try {
      const result = await uploadToYoutube({
        filePath,
        title: item.caption.substring(0, 100), // Max title length is 100 chars
        description: item.caption,
        privacyStatus: 'public',
        category: '22', // People & Blogs
        clientId: youtubeClientId,
        clientSecret: youtubeClientSecret,
        refreshToken: youtubeRefreshToken
      }, (percent) => {
        job.percent = Math.round(percent * 0.33); // Map YouTube to first 33% of progress
        job.logs.push(`[YouTube] Resumable upload progress: ${percent}%`);
      });

      job.logs.push(...result.logs);

      if (result.success) {
        item.status.youtube = 'published';
        item.publishedAt = { ...item.publishedAt, youtube: new Date().toISOString() };
        job.logs.push(`[YouTube] Upload successfully verified. Video ID: ${result.videoId}`);
      } else {
        item.status.youtube = 'failed';
        item.errors.youtube = result.error || 'Unknown error occurred during YouTube upload.';
      }
    } catch (err: any) {
      item.status.youtube = 'failed';
      item.errors.youtube = err.message || String(err);
      job.logs.push(`[YouTube] Fatal processing exception: ${err.message || err}`);
    }
    saveDB();
  }

  // 2. Instagram Reels Upload
  if (item.status.instagram === 'pending') {
    item.status.instagram = 'processing';
    saveDB();
    job.logs.push('[Instagram] Commencing Reels media pipeline.');

    try {
      const result = await uploadToInstagramReels({
        filePath,
        caption: item.caption,
        instagramBusinessId,
        accessToken: metaAccessToken
      }, (percent) => {
        // Map Instagram to middle progress block (34% to 66%)
        job.percent = 33 + Math.round(percent * 0.33);
        job.logs.push(`[Instagram] Container pipeline progress: ${percent}%`);
      });

      job.logs.push(...result.logs);

      if (result.success) {
        item.status.instagram = 'published';
        item.publishedAt = { ...item.publishedAt, instagram: new Date().toISOString() };
        job.logs.push(`[Instagram] Reels container publishing confirmed. ID: ${result.id}`);
      } else {
        item.status.instagram = 'failed';
        item.errors.instagram = result.error || 'Unknown error occurred during Instagram upload.';
      }
    } catch (err: any) {
      item.status.instagram = 'failed';
      item.errors.instagram = err.message || String(err);
      job.logs.push(`[Instagram] Fatal processing exception: ${err.message || err}`);
    }
    saveDB();
  }

  // 3. Facebook Page Reels Upload
  if (item.status.facebook === 'pending') {
    item.status.facebook = 'processing';
    saveDB();
    job.logs.push('[Facebook] Commencing Page Reels pipeline.');

    try {
      const result = await uploadToFacebookReels({
        filePath,
        caption: item.caption,
        facebookPageId,
        accessToken: metaAccessToken
      }, (percent) => {
        // Map Facebook to final progress block (67% to 100%)
        job.percent = 66 + Math.round(percent * 0.34);
        job.logs.push(`[Facebook] Reels session progress: ${percent}%`);
      });

      job.logs.push(...result.logs);

      if (result.success) {
        item.status.facebook = 'published';
        item.publishedAt = { ...item.publishedAt, facebook: new Date().toISOString() };
        job.logs.push(`[Facebook] Page Reels container publishing confirmed. ID: ${result.id}`);
      } else {
        item.status.facebook = 'failed';
        item.errors.facebook = result.error || 'Unknown error occurred during Facebook upload.';
      }
    } catch (err: any) {
      item.status.facebook = 'failed';
      item.errors.facebook = err.message || String(err);
      job.logs.push(`[Facebook] Fatal processing exception: ${err.message || err}`);
    }
    saveDB();
  }

  job.percent = 100;
  job.logs.push(`[Scheduler] All channels processed. Session complete for item ID: ${item.id}`);
}

// Start processing loop every 3 seconds
setInterval(processQueue, 3000);
