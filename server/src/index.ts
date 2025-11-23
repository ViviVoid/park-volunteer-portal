import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase } from './database';

// Load environment variables first, before importing routes that might use them
dotenv.config({ path: path.join(__dirname, '../.env') });

import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import volunteerRoutes from './routes/volunteer';
import publicRoutes from './routes/public';
import { setupCronJobs } from './services/scheduler';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
// Serve uploaded files - must be before routes
// When running from dist/, __dirname is dist/, so we need to go up one level
const uploadsPath = path.join(__dirname, '../uploads');
console.log('Serving uploads from:', uploadsPath);
app.use('/uploads', express.static(uploadsPath));

// Initialize database
initDatabase().then(() => {
  console.log('Database initialized');
  
  // Setup cron jobs for scheduled posts
  setupCronJobs();
  
  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/volunteer', volunteerRoutes);
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Serve React app in production
  if (process.env.NODE_ENV === 'production') {
    const publicPath = path.join(__dirname, '../../public');
    app.use(express.static(publicPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  }
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

