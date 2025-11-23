import express from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { dbGet, dbAll, dbRun } from '../database';
import { body, validationResult } from 'express-validator';
import { notifyVolunteers } from '../services/notifications';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

// Location Tags Management
router.get('/location-tags', async (req, res) => {
  try {
    const tags = await dbAll('SELECT * FROM location_tags ORDER BY name ASC');
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

    const { name, description, map_point, map_polygon, category, visible, color } = req.body;
    
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
    
    const result = await dbRun(
      'INSERT INTO location_tags (name, description, map_point, map_polygon, category, visible, color) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        name.trim(),
        description && description.trim() ? description.trim() : null,
        mapPointValue,
        mapPolygonValue,
        categoryValue,
        visibleValue,
        colorValue
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

export default router;

