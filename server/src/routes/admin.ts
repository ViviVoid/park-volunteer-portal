import express from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { dbGet, dbAll, dbRun } from '../database';
import { body, validationResult } from 'express-validator';
import { notifyVolunteers } from '../services/notifications';
import { salesforceService } from '../services/salesforce';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../../uploads/maps');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'map-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, .png, and .webp files are allowed'));
    }
  }
});

// Location Tags Management
router.get('/location-tags', async (req, res) => {
  try {
    const mapId = req.query.map_id;
    let query = 'SELECT * FROM location_tags';
    const params: any[] = [];
    
    if (mapId) {
      query += ' WHERE map_id = ?';
      params.push(mapId);
    }
    
    query += ' ORDER BY name ASC';
    const tags = await dbAll(query, params);
    res.json(tags);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/location-tags', [
  body('name').trim().notEmpty(),
  body('description').optional({ nullable: true, checkFalsy: true }).trim(),
  body('map_point').optional({ nullable: true, checkFalsy: true }),
  body('map_polygon').optional({ nullable: true, checkFalsy: true }),
  body('category').optional({ nullable: true, checkFalsy: true }).trim(),
  body('visible').optional({ nullable: true }).isBoolean().toBoolean(),
  body('color').optional({ nullable: true, checkFalsy: true }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, map_point, map_polygon, category, visible, color, map_id } = req.body;
    
    // Validate JSON strings if provided
    let mapPointValue = null;
    let mapPolygonValue = null;
    
    if (map_point) {
      try {
        JSON.parse(map_point);
        mapPointValue = map_point;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid map_point JSON format' });
      }
    }
    
    if (map_polygon) {
      try {
        JSON.parse(map_polygon);
        mapPolygonValue = map_polygon;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid map_polygon JSON format' });
      }
    }
    
    const visibleValue = visible !== undefined ? (visible ? 1 : 0) : 1;
    const categoryValue = category && category.trim() ? category.trim() : null;
    const colorValue = color && color.trim() && /^#[0-9A-Fa-f]{6}$/.test(color.trim()) ? color.trim() : null;
    
    const mapIdValue = map_id ? parseInt(map_id) : null;
    
    const result = await dbRun(
      'INSERT INTO location_tags (name, description, map_point, map_polygon, category, visible, color, map_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name.trim(),
        description && description.trim() ? description.trim() : null,
        mapPointValue,
        mapPolygonValue,
        categoryValue,
        visibleValue,
        colorValue,
        mapIdValue
      ]
    );

    const tag = await dbGet('SELECT * FROM location_tags WHERE id = ?', [result.lastID]);
    res.status(201).json(tag);
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Location tag with this name already exists' });
    } else {
      console.error('Error creating location tag:', error);
      res.status(500).json({ error: error.message || 'Failed to create location tag' });
    }
  }
});

router.put('/location-tags/:id', [
  body('name').optional().trim().notEmpty(),
  body('description').optional({ nullable: true, checkFalsy: true }).trim(),
  body('map_point').optional({ nullable: true, checkFalsy: true }),
  body('map_polygon').optional({ nullable: true, checkFalsy: true }),
  body('category').optional({ nullable: true, checkFalsy: true }).trim(),
  body('visible').optional({ nullable: true }).isBoolean().toBoolean(),
  body('color').optional({ nullable: true, checkFalsy: true }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates: string[] = [];
    const values: any[] = [];

    if (req.body.name) {
      updates.push('name = ?');
      values.push(req.body.name.trim());
    }
    if (req.body.description !== undefined) {
      updates.push('description = ?');
      values.push(req.body.description && req.body.description.trim() ? req.body.description.trim() : null);
    }
    if (req.body.map_point !== undefined) {
      // Validate JSON if provided
      if (req.body.map_point) {
        try {
          JSON.parse(req.body.map_point);
          updates.push('map_point = ?');
          values.push(req.body.map_point);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid map_point JSON format' });
        }
      } else {
        updates.push('map_point = ?');
        values.push(null);
      }
    }
    if (req.body.map_polygon !== undefined) {
      // Validate JSON if provided
      if (req.body.map_polygon) {
        try {
          JSON.parse(req.body.map_polygon);
          updates.push('map_polygon = ?');
          values.push(req.body.map_polygon);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid map_polygon JSON format' });
        }
      } else {
        updates.push('map_polygon = ?');
        values.push(null);
      }
    }
    if (req.body.category !== undefined) {
      updates.push('category = ?');
      values.push(req.body.category && req.body.category.trim() ? req.body.category.trim() : null);
    }
    if (req.body.visible !== undefined) {
      updates.push('visible = ?');
      values.push(req.body.visible ? 1 : 0);
    }
    if (req.body.color !== undefined) {
      if (req.body.color && req.body.color.trim() && /^#[0-9A-Fa-f]{6}$/.test(req.body.color.trim())) {
        updates.push('color = ?');
        values.push(req.body.color.trim());
      } else {
        updates.push('color = ?');
        values.push(null);
      }
    }
    if (req.body.map_id !== undefined) {
      updates.push('map_id = ?');
      values.push(req.body.map_id ? parseInt(req.body.map_id) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    await dbRun(
      `UPDATE location_tags SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const tag = await dbGet('SELECT * FROM location_tags WHERE id = ?', [id]);
    res.json(tag);
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Location tag with this name already exists' });
    } else {
      console.error('Error updating location tag:', error);
      res.status(500).json({ error: error.message || 'Failed to update location tag' });
    }
  }
});

router.delete('/location-tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if location tag is being used
    const inUse = await dbGet(
      'SELECT COUNT(*) as count FROM position_templates WHERE location_id = ?',
      [id]
    );
    const inUsePositions = await dbGet(
      'SELECT COUNT(*) as count FROM positions WHERE location_id = ?',
      [id]
    );
    
    if ((inUse as any).count > 0 || (inUsePositions as any).count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete location tag that is in use by templates or positions' 
      });
    }

    await dbRun('DELETE FROM location_tags WHERE id = ?', [id]);
    res.json({ message: 'Location tag deleted' });
  } catch (error: any) {
    console.error('Error deleting location tag:', error);
    res.status(500).json({ error: error.message || 'Failed to delete location tag' });
  }
});

// Maps Management
router.get('/maps', async (req, res) => {
  try {
    const maps = await dbAll('SELECT * FROM maps ORDER BY is_default DESC, name ASC');
    res.json(maps);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/maps', upload.single('image'), [
  body('name').trim().notEmpty(),
  body('is_default').optional().isBoolean().toBoolean(),
  body('image_bounds').optional(),
  body('parent_map_id').optional().isInt().toInt(),
  body('crop_bounds').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { name, is_default, image_bounds, parent_map_id, crop_bounds } = req.body;
    const imageUrl = `/uploads/maps/${req.file.filename}`;

    // If this is set as default, unset all other defaults
    if (is_default) {
      await dbRun('UPDATE maps SET is_default = 0');
    }

    // Validate image_bounds JSON if provided
    let imageBoundsValue = null;
    if (image_bounds) {
      try {
        JSON.parse(image_bounds);
        imageBoundsValue = image_bounds;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid image_bounds JSON format' });
      }
    }

    // Validate crop_bounds JSON if provided
    let cropBoundsValue = null;
    if (crop_bounds) {
      try {
        JSON.parse(crop_bounds);
        cropBoundsValue = crop_bounds;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid crop_bounds JSON format' });
      }
    }

    const isDefaultValue = is_default ? 1 : 0;
    const parentMapIdValue = parent_map_id ? parseInt(parent_map_id) : null;

    const result = await dbRun(
      'INSERT INTO maps (name, image_url, image_bounds, is_default, parent_map_id, crop_bounds) VALUES (?, ?, ?, ?, ?, ?)',
      [name.trim(), imageUrl, imageBoundsValue, isDefaultValue, parentMapIdValue, cropBoundsValue]
    );

    const map = await dbGet('SELECT * FROM maps WHERE id = ?', [result.lastID]);
    res.json(map);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/maps/:id', upload.single('image'), [
  body('name').optional().trim().notEmpty(),
  body('is_default').optional().isBoolean().toBoolean(),
  body('image_bounds').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, is_default, image_bounds } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (req.file) {
      // Get old file to delete it
      const oldMap = await dbGet('SELECT image_url FROM maps WHERE id = ?', [id]);
      if (oldMap && oldMap.image_url) {
        const oldFilePath = path.join(__dirname, '../../', oldMap.image_url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      updates.push('image_url = ?');
      values.push(`/uploads/maps/${req.file.filename}`);
    }

    if (image_bounds !== undefined) {
      if (image_bounds) {
        try {
          JSON.parse(image_bounds);
          updates.push('image_bounds = ?');
          values.push(image_bounds);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid image_bounds JSON format' });
        }
      } else {
        updates.push('image_bounds = ?');
        values.push(null);
      }
    }

    if (is_default !== undefined) {
      // If setting as default, unset all other defaults
      if (is_default) {
        await dbRun('UPDATE maps SET is_default = 0');
      }
      updates.push('is_default = ?');
      values.push(is_default ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    await dbRun(
      `UPDATE maps SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const map = await dbGet('SELECT * FROM maps WHERE id = ?', [id]);
    res.json(map);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/maps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if there are location tags using this map
    const tags = await dbAll('SELECT COUNT(*) as count FROM location_tags WHERE map_id = ?', [id]);
    if (tags[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete map that has associated location tags' });
    }

    // Get map to delete image file
    const map = await dbGet('SELECT image_url FROM maps WHERE id = ?', [id]);
    if (map && map.image_url) {
      const filePath = path.join(__dirname, '../../', map.image_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await dbRun('DELETE FROM maps WHERE id = ?', [id]);
    res.json({ message: 'Map deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Requirement Tags Management
router.get('/requirement-tags', async (req, res) => {
  try {
    const tags = await dbAll('SELECT * FROM requirement_tags ORDER BY name ASC');
    res.json(tags);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/requirement-tags', [
  body('name').trim().notEmpty(),
  body('description').optional({ nullable: true, checkFalsy: true }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;
    
    const result = await dbRun(
      'INSERT INTO requirement_tags (name, description) VALUES (?, ?)',
      [name.trim(), description && description.trim() ? description.trim() : null]
    );

    const tag = await dbGet('SELECT * FROM requirement_tags WHERE id = ?', [result.lastID]);
    res.status(201).json(tag);
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Requirement tag with this name already exists' });
    } else {
      console.error('Error creating requirement tag:', error);
      res.status(500).json({ error: error.message || 'Failed to create requirement tag' });
    }
  }
});

router.put('/requirement-tags/:id', [
  body('name').optional().trim().notEmpty(),
  body('description').optional({ nullable: true, checkFalsy: true }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates: string[] = [];
    const values: any[] = [];

    if (req.body.name) {
      updates.push('name = ?');
      values.push(req.body.name.trim());
    }
    if (req.body.description !== undefined) {
      updates.push('description = ?');
      values.push(req.body.description && req.body.description.trim() ? req.body.description.trim() : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    await dbRun(
      `UPDATE requirement_tags SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const tag = await dbGet('SELECT * FROM requirement_tags WHERE id = ?', [id]);
    res.json(tag);
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Requirement tag with this name already exists' });
    } else {
      console.error('Error updating requirement tag:', error);
      res.status(500).json({ error: error.message || 'Failed to update requirement tag' });
    }
  }
});

router.delete('/requirement-tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if requirement tag is being used
    const inUse = await dbGet(
      'SELECT COUNT(*) as count FROM template_requirement_tags WHERE requirement_tag_id = ?',
      [id]
    );
    
    if ((inUse as any).count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete requirement tag that is in use by templates' 
      });
    }

    await dbRun('DELETE FROM requirement_tags WHERE id = ?', [id]);
    res.json({ message: 'Requirement tag deleted' });
  } catch (error: any) {
    console.error('Error deleting requirement tag:', error);
    res.status(500).json({ error: error.message || 'Failed to delete requirement tag' });
  }
});

// Get all position templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await dbAll(`
      SELECT t.*, lt.name as location_name, lt.id as location_tag_id
      FROM position_templates t
      LEFT JOIN location_tags lt ON t.location_id = lt.id
      ORDER BY t.created_at DESC
    `);
    
    // Get requirement tags for each template
    const templatesWithTags = await Promise.all(templates.map(async (template: any) => {
      const requirementTags = await dbAll(`
        SELECT rt.*
        FROM requirement_tags rt
        INNER JOIN template_requirement_tags trt ON rt.id = trt.requirement_tag_id
        WHERE trt.template_id = ?
        ORDER BY rt.name ASC
      `, [template.id]);
      return { ...template, requirement_tags: requirementTags };
    }));
    
    res.json(templatesWithTags);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create position template
router.post('/templates', [
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('requirements').optional({ nullable: true, checkFalsy: true }).trim(),
  body('duration_hours')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty values
      }
      const num = parseInt(value, 10);
      return !isNaN(num) && num >= 0;
    })
    .withMessage('Duration must be a non-negative integer'),
  body('location_id').optional({ nullable: true, checkFalsy: true }).isInt(),
  body('location').optional({ nullable: true, checkFalsy: true }).trim(),
  body('requirement_tag_ids').optional().isArray(),
  body('requirement_tag_ids.*').optional().isInt()
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, requirements, duration_hours, location_id, location, requirement_tag_ids } = req.body;
    
    // Convert empty strings to null and parse duration_hours
    let durationHoursValue = null;
    if (duration_hours !== '' && duration_hours !== undefined && duration_hours !== null) {
      const parsed = parseInt(duration_hours, 10);
      durationHoursValue = isNaN(parsed) ? null : parsed;
    }
    
    // Handle location_id - convert empty string to null
    const locationIdValue = location_id === '' || location_id === undefined || location_id === null
      ? null
      : parseInt(location_id, 10);
    
    const result = await dbRun(
      'INSERT INTO position_templates (title, description, requirements, duration_hours, location_id, location) VALUES (?, ?, ?, ?, ?, ?)',
      [
        title, 
        description, 
        requirements && requirements.trim() ? requirements.trim() : null, 
        durationHoursValue,
        isNaN(locationIdValue) ? null : locationIdValue,
        location && location.trim() ? location.trim() : null
      ]
    );

    // Associate requirement tags
    if (requirement_tag_ids && Array.isArray(requirement_tag_ids) && requirement_tag_ids.length > 0) {
      for (const tagId of requirement_tag_ids) {
        const tagIdNum = parseInt(tagId, 10);
        if (!isNaN(tagIdNum)) {
          try {
            await dbRun(
              'INSERT INTO template_requirement_tags (template_id, requirement_tag_id) VALUES (?, ?)',
              [result.lastID, tagIdNum]
            );
          } catch (e: any) {
            // Ignore duplicate key errors
            if (!e.message || !e.message.includes('UNIQUE constraint')) {
              throw e;
            }
          }
        }
      }
    }

    // Get template with all associations
    const template = await dbGet(`
      SELECT t.*, lt.name as location_name, lt.id as location_tag_id
      FROM position_templates t
      LEFT JOIN location_tags lt ON t.location_id = lt.id
      WHERE t.id = ?
    `, [result.lastID]);
    
    const requirementTags = await dbAll(`
      SELECT rt.*
      FROM requirement_tags rt
      INNER JOIN template_requirement_tags trt ON rt.id = trt.requirement_tag_id
      WHERE trt.template_id = ?
      ORDER BY rt.name ASC
    `, [result.lastID]);
    
    res.status(201).json({ ...template, requirement_tags: requirementTags });
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message || 'Failed to create template' });
  }
});

// Update position template
router.put('/templates/:id', [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates: string[] = [];
    const values: any[] = [];

    if (req.body.title) {
      updates.push('title = ?');
      values.push(req.body.title);
    }
    if (req.body.description) {
      updates.push('description = ?');
      values.push(req.body.description);
    }
    if (req.body.requirements !== undefined) {
      updates.push('requirements = ?');
      values.push(req.body.requirements && req.body.requirements.trim() ? req.body.requirements.trim() : null);
    }
    if (req.body.duration_hours !== undefined) {
      let durationHoursValue = null;
      if (req.body.duration_hours !== '' && req.body.duration_hours !== null) {
        const parsed = parseInt(req.body.duration_hours, 10);
        durationHoursValue = isNaN(parsed) ? null : parsed;
      }
      updates.push('duration_hours = ?');
      values.push(durationHoursValue);
    }
    if (req.body.location_id !== undefined) {
      const locationIdValue = req.body.location_id === '' || req.body.location_id === null
        ? null
        : parseInt(req.body.location_id, 10);
      updates.push('location_id = ?');
      values.push(isNaN(locationIdValue) ? null : locationIdValue);
    }
    if (req.body.location !== undefined) {
      updates.push('location = ?');
      values.push(req.body.location && req.body.location.trim() ? req.body.location.trim() : null);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await dbRun(
      `UPDATE position_templates SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Update requirement tag associations if provided
    if (req.body.requirement_tag_ids !== undefined) {
      // Delete existing associations
      await dbRun('DELETE FROM template_requirement_tags WHERE template_id = ?', [id]);
      
      // Add new associations
      if (Array.isArray(req.body.requirement_tag_ids) && req.body.requirement_tag_ids.length > 0) {
        for (const tagId of req.body.requirement_tag_ids) {
          const tagIdNum = parseInt(tagId, 10);
          if (!isNaN(tagIdNum)) {
            try {
              await dbRun(
                'INSERT INTO template_requirement_tags (template_id, requirement_tag_id) VALUES (?, ?)',
                [id, tagIdNum]
              );
            } catch (e: any) {
              // Ignore duplicate key errors
              if (!e.message || !e.message.includes('UNIQUE constraint')) {
                throw e;
              }
            }
          }
        }
      }
    }

    // Get template with all associations
    const template = await dbGet(`
      SELECT t.*, lt.name as location_name, lt.id as location_tag_id
      FROM position_templates t
      LEFT JOIN location_tags lt ON t.location_id = lt.id
      WHERE t.id = ?
    `, [id]);
    
    const requirementTags = await dbAll(`
      SELECT rt.*
      FROM requirement_tags rt
      INNER JOIN template_requirement_tags trt ON rt.id = trt.requirement_tag_id
      WHERE trt.template_id = ?
      ORDER BY rt.name ASC
    `, [id]);
    
    res.json({ ...template, requirement_tags: requirementTags });
  } catch (error: any) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message || 'Failed to update template' });
  }
});

// Delete position template
router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM position_templates WHERE id = ?', [id]);
    res.json({ message: 'Template deleted' });
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message || 'Failed to create template' });
  }
});

// Post position from template
router.post('/positions', [
  body('template_id').isInt(),
  body('date').isISO8601(),
  body('start_time').matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  body('end_time').optional().matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  body('max_volunteers').optional().isInt({ min: 1 })
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { template_id, date, start_time, end_time, max_volunteers } = req.body;

    // Get template
    const template: any = await dbGet(`
      SELECT t.*, lt.id as location_id, lt.name as location_name
      FROM position_templates t
      LEFT JOIN location_tags lt ON t.location_id = lt.id
      WHERE t.id = ?
    `, [template_id]);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Create position
    const result: any = await dbRun(
      `INSERT INTO positions (template_id, title, description, requirements, duration_hours, location_id, location, date, start_time, end_time, max_volunteers, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        template_id,
        template.title,
        template.description,
        template.requirements,
        template.duration_hours,
        template.location_id || null,
        template.location || template.location_name || null,
        date,
        start_time,
        end_time || null,
        max_volunteers || null,
        req.userId
      ]
    );

    const position = await dbGet('SELECT * FROM positions WHERE id = ?', [result.lastID]);

    // Notify all volunteers about the new position
    await notifyVolunteers({
      positionId: result.lastID,
      title: template.title,
      date,
      start_time,
      location: template.location_name || template.location || null
    });

    res.status(201).json(position);
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message || 'Failed to create template' });
  }
});

// Get all positions
router.get('/positions', async (req, res) => {
  try {
    const positions = await dbAll(`
      SELECT p.*, u.name as created_by_name,
             lt.name as location_name, lt.id as location_tag_id,
             (SELECT COUNT(*) FROM signups WHERE position_id = p.id AND status IN ('pending', 'confirmed')) as volunteer_count
      FROM positions p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN location_tags lt ON p.location_id = lt.id
      ORDER BY p.date DESC, p.start_time DESC
    `);
    res.json(positions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get position details with signups
router.get('/positions/:id', async (req, res) => {
  try {
    const position: any = await dbGet(`
      SELECT p.*, u.name as created_by_name
      FROM positions p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    const signups = await dbAll(`
      SELECT s.*, u.name, u.email, u.phone
      FROM signups s
      JOIN users u ON s.volunteer_id = u.id
      WHERE s.position_id = ?
      ORDER BY s.signed_up_at DESC
    `, [req.params.id]);

    res.json({ ...position, signups });
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message || 'Failed to create template' });
  }
});

// Ping/notify volunteers for a position
router.post('/positions/:id/notify', async (req, res) => {
  try {
    const { id } = req.params;
    const position: any = await dbGet('SELECT * FROM positions WHERE id = ?', [id]);
    
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    const positionWithLocation: any = await dbGet(`
      SELECT p.*, lt.name as location_name
      FROM positions p
      LEFT JOIN location_tags lt ON p.location_id = lt.id
      WHERE p.id = ?
    `, [id]);
    
    await notifyVolunteers({
      positionId: id,
      title: position.title,
      date: position.date,
      start_time: position.start_time,
      location: positionWithLocation?.location_name || position.location || null
    });

    res.json({ message: 'Volunteers notified' });
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message || 'Failed to create template' });
  }
});

// Create scheduled post
router.post('/scheduled-posts', [
  body('template_id').isInt(),
  body('cron_expression').notEmpty(),
  body('days_ahead').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { template_id, cron_expression, days_ahead = 7 } = req.body;
    const result: any = await dbRun(
      'INSERT INTO scheduled_posts (template_id, cron_expression, days_ahead) VALUES (?, ?, ?)',
      [template_id, cron_expression, days_ahead]
    );

    const scheduled = await dbGet('SELECT * FROM scheduled_posts WHERE id = ?', [result.lastID]);
    res.status(201).json(scheduled);
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message || 'Failed to create template' });
  }
});

// Get all scheduled posts
router.get('/scheduled-posts', async (req, res) => {
  try {
    const scheduled = await dbAll(`
      SELECT sp.*, pt.title as template_title
      FROM scheduled_posts sp
      JOIN position_templates pt ON sp.template_id = pt.id
      ORDER BY sp.created_at DESC
    `);
    res.json(scheduled);
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message || 'Failed to create template' });
  }
});

// Toggle scheduled post active status
router.patch('/scheduled-posts/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const scheduled: any = await dbGet('SELECT * FROM scheduled_posts WHERE id = ?', [id]);
    if (!scheduled) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }

    await dbRun(
      'UPDATE scheduled_posts SET is_active = ? WHERE id = ?',
      [scheduled.is_active ? 0 : 1, id]
    );

    res.json({ message: 'Status updated' });
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message || 'Failed to create template' });
  }
});

// Delete scheduled post
router.delete('/scheduled-posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const scheduled: any = await dbGet('SELECT * FROM scheduled_posts WHERE id = ?', [id]);
    if (!scheduled) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }

    await dbRun('DELETE FROM scheduled_posts WHERE id = ?', [id]);
    res.json({ message: 'Scheduled post deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting scheduled post:', error);
    res.status(500).json({ error: error.message || 'Failed to delete scheduled post' });
  }
});

// Salesforce Integration Routes

// Connect to Salesforce (mock - for MVP demonstration)
router.post('/salesforce/connect', [
  body('api_key').notEmpty().withMessage('API key is required')
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { api_key } = req.body;
    const connected = await salesforceService.connect(api_key);
    
    if (connected) {
      // Sync existing volunteers to Salesforce
      const volunteers: any[] = await dbAll(
        'SELECT id, email, phone, name, notification_preference FROM users WHERE role = ?',
        ['volunteer']
      );
      await salesforceService.syncContacts(volunteers);
      
      res.json({ 
        success: true, 
        message: 'Connected to Salesforce (Mock Mode)',
        contactsSynced: volunteers.length,
        note: 'This is a mock implementation for MVP demonstration'
      });
    } else {
      res.status(400).json({ error: 'Failed to connect to Salesforce' });
    }
  } catch (error: any) {
    console.error('Error connecting to Salesforce:', error);
    res.status(500).json({ error: error.message || 'Failed to connect to Salesforce' });
  }
});

// Get Salesforce connection status
router.get('/salesforce/status', async (req: AuthRequest, res) => {
  try {
    const isConnected = salesforceService.isApiConnected();
    const contactCount = await salesforceService.getContactCount();
    const campaigns = await salesforceService.getAllCampaigns();
    
    res.json({
      connected: isConnected,
      contactCount,
      campaignCount: campaigns.length,
      note: isConnected ? 'Mock Salesforce integration active' : 'Not connected'
    });
  } catch (error: any) {
    console.error('Error getting Salesforce status:', error);
    res.status(500).json({ error: error.message || 'Failed to get Salesforce status' });
  }
});

// Organization Announcements Routes

// Get all announcements
router.get('/announcements', async (req: AuthRequest, res) => {
  try {
    const announcements = await dbAll(`
      SELECT a.*, u.name as created_by_name
      FROM organization_announcements a
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
    `);
    res.json(announcements);
  } catch (error: any) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch announcements' });
  }
});

// Create announcement
router.post('/announcements', [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('type').isIn(['email', 'sms', 'both']).withMessage('Type must be email, sms, or both'),
  body('link').optional().isURL().withMessage('Link must be a valid URL'),
  body('cron_expression').optional()
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, link, type, cron_expression } = req.body;
    
    // Calculate next_send_at if cron expression provided
    let next_send_at = null;
    if (cron_expression) {
      // Simple calculation - in production, use a proper cron parser
      const now = new Date();
      next_send_at = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Default to tomorrow
    }

    const result: any = await dbRun(
      `INSERT INTO organization_announcements (title, description, link, type, cron_expression, next_send_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description, link || null, type, cron_expression || null, next_send_at, req.userId]
    );

    const announcement = await dbGet(
      'SELECT a.*, u.name as created_by_name FROM organization_announcements a LEFT JOIN users u ON a.created_by = u.id WHERE a.id = ?',
      [result.lastID]
    );

    // If no cron expression, send immediately
    if (!cron_expression) {
      await sendAnnouncement(announcement);
    }

    res.status(201).json(announcement);
  } catch (error: any) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: error.message || 'Failed to create announcement' });
  }
});

// Send announcement immediately
router.post('/announcements/:id/send', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const announcement: any = await dbGet(
      'SELECT a.*, u.name as created_by_name FROM organization_announcements a LEFT JOIN users u ON a.created_by = u.id WHERE a.id = ?',
      [id]
    );

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await sendAnnouncement(announcement);
    
    // Update last_sent_at
    await dbRun(
      'UPDATE organization_announcements SET last_sent_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    res.json({ message: 'Announcement sent successfully' });
  } catch (error: any) {
    console.error('Error sending announcement:', error);
    res.status(500).json({ error: error.message || 'Failed to send announcement' });
  }
});

// Toggle announcement active status
router.patch('/announcements/:id/toggle', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const announcement: any = await dbGet('SELECT * FROM organization_announcements WHERE id = ?', [id]);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await dbRun(
      'UPDATE organization_announcements SET is_active = ? WHERE id = ?',
      [announcement.is_active ? 0 : 1, id]
    );

    res.json({ message: 'Status updated' });
  } catch (error: any) {
    console.error('Error toggling announcement:', error);
    res.status(500).json({ error: error.message || 'Failed to update announcement' });
  }
});

// Delete announcement
router.delete('/announcements/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const announcement: any = await dbGet('SELECT * FROM organization_announcements WHERE id = ?', [id]);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await dbRun('DELETE FROM organization_announcements WHERE id = ?', [id]);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: error.message || 'Failed to delete announcement' });
  }
});

// Helper function to send announcement
async function sendAnnouncement(announcement: any) {
  const volunteers: any[] = await dbAll(
    'SELECT id, email, phone, name, notification_preference FROM users WHERE role = ?',
    ['volunteer']
  );

  const description = announcement.description || announcement.message || ''; // Support both for migration
  const linkText = announcement.link ? `\n\nView document: ${announcement.link}` : '';
  const linkHtml = announcement.link ? `<p style="margin-top: 1rem;"><a href="${announcement.link}" style="color: var(--primary-color); text-decoration: none; font-weight: bold;">View Document →</a></p>` : '';

  // Use Salesforce if connected, otherwise use direct notifications
  if (salesforceService.isApiConnected()) {
    try {
      if (announcement.type === 'email' || announcement.type === 'both') {
        await salesforceService.createEmailCampaign({
          name: announcement.title,
          subject: announcement.title,
          message: description + linkText,
        });
      }
      if (announcement.type === 'sms' || announcement.type === 'both') {
        await salesforceService.createSMSCampaign({
          name: announcement.title,
          message: `${announcement.title}\n\n${description}${linkText}`,
        });
      }
    } catch (error) {
      console.error('Error sending via Salesforce, falling back to direct notifications:', error);
      // Fall through to direct notifications
    }
  }

  // Send via direct notifications (existing system)
  for (const volunteer of volunteers) {
    const pref = volunteer.notification_preference || 'email';

    if ((announcement.type === 'email' || announcement.type === 'both') && (pref === 'email' || pref === 'both')) {
      if (volunteer.email) {
        try {
          const emailTransporter = require('nodemailer').createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          });

          await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@park.local',
            to: volunteer.email,
            subject: announcement.title,
            text: description + linkText,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>${announcement.title}</h2>
              <div style="white-space: pre-wrap; line-height: 1.6;">${description}</div>
              ${linkHtml}
            </div>`
          });
        } catch (error) {
          console.error(`Failed to send email to ${volunteer.email}:`, error);
        }
      }
    }

    if ((announcement.type === 'sms' || announcement.type === 'both') && (pref === 'phone' || pref === 'both')) {
      if (volunteer.phone) {
        try {
          const twilio = require('twilio');
          const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
            ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
            : null;

          if (twilioClient) {
            await twilioClient.messages.create({
              body: `${announcement.title}\n\n${description}${linkText}`,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: volunteer.phone
            });
          }
        } catch (error) {
          console.error(`Failed to send SMS to ${volunteer.phone}:`, error);
        }
      }
    }
  }
}

export default router;

