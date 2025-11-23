import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import volunteerRoutes from './routes/volunteer';
import { setupCronJobs } from './services/scheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize database
initDatabase().then(() => {
  console.log('Database initialized');
  
  // Setup cron jobs for scheduled posts
  setupCronJobs();
  
  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/volunteer', volunteerRoutes);
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

