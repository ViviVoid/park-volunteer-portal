import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbGet, dbAll, dbRun } from '../database';
import { body, validationResult } from 'express-validator';

const router = express.Router();

router.use(authenticateToken);

// Get available positions
router.get('/positions', async (req: AuthRequest, res) => {
  try {
    const positions = await dbAll(`
      SELECT p.*,
             lt.name as location_name,
             (SELECT COUNT(*) FROM signups WHERE position_id = p.id AND status IN ('pending', 'confirmed')) as current_volunteers,
             (SELECT COUNT(*) FROM signups WHERE position_id = p.id AND volunteer_id = ? AND status IN ('pending', 'confirmed')) as has_signed_up
      FROM positions p
      LEFT JOIN location_tags lt ON p.location_id = lt.id
      WHERE p.status = 'open' AND p.date >= date('now')
      ORDER BY p.date ASC, p.start_time ASC
    `, [req.userId]);

    res.json(positions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get my signups
router.get('/signups', async (req: AuthRequest, res) => {
  try {
    const signups = await dbAll(`
      SELECT s.*, p.title, p.description, p.date, p.start_time, p.end_time, p.location, lt.name as location_name, p.status as position_status
      FROM signups s
      JOIN positions p ON s.position_id = p.id
      LEFT JOIN location_tags lt ON p.location_id = lt.id
      WHERE s.volunteer_id = ?
      ORDER BY p.date ASC, p.start_time ASC
    `, [req.userId]);

    res.json(signups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sign up for a position
router.post('/signups', [
  body('position_id').isInt()
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { position_id } = req.body;

    // Check if position exists and is open
    const position: any = await dbGet('SELECT * FROM positions WHERE id = ?', [position_id]);
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    if (position.status !== 'open') {
      return res.status(400).json({ error: 'Position is not open for signups' });
    }

    // Check if already signed up
    const existing = await dbGet(
      'SELECT id FROM signups WHERE position_id = ? AND volunteer_id = ?',
      [position_id, req.userId]
    );
    if (existing) {
      return res.status(400).json({ error: 'Already signed up for this position' });
    }

    // Check if position is full
    if (position.max_volunteers) {
      const count: any = await dbGet(
        'SELECT COUNT(*) as count FROM signups WHERE position_id = ? AND status IN (\'pending\', \'confirmed\')',
        [position_id]
      );
      if (count.count >= position.max_volunteers) {
        return res.status(400).json({ error: 'Position is full' });
      }
    }

    const result: any = await dbRun(
      'INSERT INTO signups (position_id, volunteer_id) VALUES (?, ?)',
      [position_id, req.userId]
    );

    // Update position volunteer count
    await dbRun(
      'UPDATE positions SET current_volunteers = current_volunteers + 1 WHERE id = ?',
      [position_id]
    );

    const signup = await dbGet('SELECT * FROM signups WHERE id = ?', [result.lastID]);
    res.status(201).json(signup);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel signup
router.delete('/signups/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const signup: any = await dbGet('SELECT * FROM signups WHERE id = ? AND volunteer_id = ?', [id, req.userId]);
    
    if (!signup) {
      return res.status(404).json({ error: 'Signup not found' });
    }

    await dbRun('UPDATE signups SET status = \'cancelled\' WHERE id = ?', [id]);
    
    // Update position volunteer count
    await dbRun(
      'UPDATE positions SET current_volunteers = CASE WHEN current_volunteers > 0 THEN current_volunteers - 1 ELSE 0 END WHERE id = ?',
      [signup.position_id]
    );

    res.json({ message: 'Signup cancelled' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update notification preference
router.patch('/profile/preferences', [
  body('notification_preference').isIn(['email', 'phone', 'both'])
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { notification_preference } = req.body;
    await dbRun(
      'UPDATE users SET notification_preference = ? WHERE id = ?',
      [notification_preference, req.userId]
    );

    res.json({ message: 'Preferences updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile
router.get('/profile', async (req: AuthRequest, res) => {
  try {
    const user: any = await dbGet(
      'SELECT id, email, name, phone, role, notification_preference FROM users WHERE id = ?',
      [req.userId]
    );
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

