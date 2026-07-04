import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { 
  getQueue, 
  addQueueItem, 
  deleteQueueItem, 
  get24HourStats, 
  jobLogs,
  clearQueue
} from './src/server/queueManager';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Expose uploads directory statically so frontend can preview clips
  app.use('/uploads', express.static(uploadsDir));

  // Multer Storage configuration
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `video-${uniqueSuffix}${ext}`);
    }
  });

  // Filter only mp4 and mov files under 100MB
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
    },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const mime = file.mimetype;
      if (
        (ext === '.mp4' || ext === '.mov') &&
        (mime === 'video/mp4' || mime === 'video/quicktime')
      ) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only MP4 and MOV videos are allowed.'));
      }
    }
  });

  // API: Get App Credentials Status
  app.get('/api/config', (req, res) => {
    res.json({
      hasYoutubeCredentials: !!(
        process.env.YOUTUBE_CLIENT_ID &&
        process.env.YOUTUBE_CLIENT_SECRET &&
        process.env.YOUTUBE_REFRESH_TOKEN
      ),
      hasMetaCredentials: !!(
        process.env.FACEBOOK_ACCESS_TOKEN &&
        (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.FACEBOOK_PAGE_ID)
      ),
      env: {
        youtubeClientId: process.env.YOUTUBE_CLIENT_ID ? 'Configured (Ends in ...' + process.env.YOUTUBE_CLIENT_ID.substring(process.env.YOUTUBE_CLIENT_ID.length - 6) + ')' : 'Missing',
        instagramBusinessId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ? 'Configured (' + process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID + ')' : 'Missing',
        facebookPageId: process.env.FACEBOOK_PAGE_ID ? 'Configured (' + process.env.FACEBOOK_PAGE_ID + ')' : 'Missing',
        metaAccessToken: process.env.FACEBOOK_ACCESS_TOKEN ? 'Configured (Ends in ...' + process.env.FACEBOOK_ACCESS_TOKEN.substring(process.env.FACEBOOK_ACCESS_TOKEN.length - 8) + ')' : 'Missing'
      }
    });
  });

  // API: Get stats of daily limits
  app.get('/api/stats', (req, res) => {
    try {
      const stats = get24HourStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Get current queue
  app.get('/api/queue', (req, res) => {
    try {
      res.json(getQueue());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Add item to queue (Upload video + schedule)
  app.post('/api/queue', (req, res, next) => {
    upload.single('video')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size allowed is 100MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  }, (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload a video file.' });
      }

      const { caption, youtube, instagram, facebook, scheduledFor } = req.body;

      if (!caption || caption.trim() === '') {
        return res.status(400).json({ error: 'Caption is required.' });
      }

      if (caption.length > 2200) {
        return res.status(400).json({ error: 'Caption must be under 2200 characters.' });
      }

      const parsedYoutube = youtube === 'true' || youtube === true;
      const parsedInstagram = instagram === 'true' || instagram === true;
      const parsedFacebook = facebook === 'true' || facebook === true;

      if (!parsedYoutube && !parsedInstagram && !parsedFacebook) {
        return res.status(400).json({ error: 'Please select at least one target platform.' });
      }

      const itemDate = scheduledFor ? scheduledFor : new Date().toISOString();

      const newItem = addQueueItem({
        originalName: req.file.originalname,
        filename: req.file.filename,
        caption: caption,
        size: req.file.size,
        platforms: {
          youtube: parsedYoutube,
          instagram: parsedInstagram,
          facebook: parsedFacebook
        },
        scheduledFor: itemDate
      });

      res.status(201).json(newItem);
    } catch (err: any) {
      // Clean up uploaded file if queue insertion failed due to limits or validation
      if (req.file) {
        const uploadedFilePath = path.join(uploadsDir, req.file.filename);
        if (fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
      }
      res.status(400).json({ error: err.message || String(err) });
    }
  });

  // API: Delete queue item
  app.delete('/api/queue/:id', (req, res) => {
    try {
      const deleted = deleteQueueItem(req.params.id);
      if (deleted) {
        res.json({ success: true, message: 'Queue item successfully deleted.' });
      } else {
        res.status(404).json({ error: 'Queue item not found.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Clear queue database
  app.post('/api/queue/clear', (req, res) => {
    try {
      clearQueue();
      res.json({ success: true, message: 'Queue successfully cleared.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Get live logs & progress percentage
  app.get('/api/logs/:id', (req, res) => {
    const job = jobLogs[req.params.id];
    if (job) {
      res.json(job);
    } else {
      res.json({ percent: 100, logs: ['[System] Job inactive or finalized.'] });
    }
  });

  // Serve static assets / handle frontend routes via Vite middleware in Dev or standard static files in Prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Fullstack Server] Running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
