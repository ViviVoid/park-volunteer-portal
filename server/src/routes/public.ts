import express from 'express';
import { dbGet, dbAll } from '../database';

const router = express.Router();

// Get public maps
router.get('/maps', async (req, res) => {
  try {
    // Only return maps that are marked as public
    const maps = await dbAll('SELECT * FROM maps WHERE public = 1 ORDER BY is_default DESC, name ASC');
    res.json(maps);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get location tags for a public map
router.get('/maps/:mapId/location-tags', async (req, res) => {
  try {
    const { mapId } = req.params;
    
    // First verify the map is public
    const map = await dbGet('SELECT * FROM maps WHERE id = ? AND public = 1', [mapId]);
    if (!map) {
      return res.status(404).json({ error: 'Map not found or not publicly available' });
    }
    
    // Get location tags for this map that are visible
    const tags = await dbAll(
      'SELECT * FROM location_tags WHERE map_id = ? AND visible = 1 ORDER BY name ASC',
      [mapId]
    );
    res.json(tags);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

