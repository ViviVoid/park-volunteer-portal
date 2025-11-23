import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import bcrypt from 'bcryptjs';

let db: sqlite3.Database | null = null;

// Get or create database connection
function getDb(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database('./volunteer_portal.db');
    // Handle connection errors and recreate if needed
    db.on('error', (err: Error) => {
      console.error('Database error:', err);
      // Close and recreate connection
      if (db) {
        db.close((closeErr) => {
          if (closeErr) {
            console.error('Error closing database:', closeErr);
          }
          db = null;
          // Recreate connection
          getDb();
        });
      }
    });
  }
  return db;
}

// Custom dbRun wrapper to preserve lastID
export function dbRun(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.run(sql, params || [], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

export function dbGet(sql: string, params?: any[]): Promise<any> {
  const database = getDb();
  return promisify(database.get.bind(database))(sql, params);
}

export function dbAll(sql: string, params?: any[]): Promise<any[]> {
  const database = getDb();
  return promisify(database.all.bind(database))(sql, params);
}

export async function initDatabase() {
  // Users table (admins and volunteers)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL CHECK(role IN ('admin', 'volunteer')),
      notification_preference TEXT NOT NULL DEFAULT 'email' CHECK(notification_preference IN ('email', 'phone', 'both')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Maps table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      image_bounds TEXT,
      is_default INTEGER DEFAULT 0,
      parent_map_id INTEGER,
      crop_bounds TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_map_id) REFERENCES maps(id)
    )
  `);
  
  // Add parent_map_id and crop_bounds columns if they don't exist
  try {
    await dbRun(`ALTER TABLE maps ADD COLUMN parent_map_id INTEGER`);
  } catch (e: any) {
    // Column already exists, ignore
  }
  try {
    await dbRun(`ALTER TABLE maps ADD COLUMN crop_bounds TEXT`);
  } catch (e: any) {
    // Column already exists, ignore
  }
  // Add public column if it doesn't exist
  try {
    await dbRun(`ALTER TABLE maps ADD COLUMN public INTEGER DEFAULT 0`);
  } catch (e: any) {
    // Column already exists, ignore
  }

  // Location tags
  await dbRun(`
    CREATE TABLE IF NOT EXISTS location_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      map_point TEXT,
      map_polygon TEXT,
      category TEXT,
      visible INTEGER DEFAULT 1,
      color TEXT,
      map_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (map_id) REFERENCES maps(id)
    )
  `);

  // Add map fields to existing location_tags table if they don't exist
  try {
    await dbRun(`ALTER TABLE location_tags ADD COLUMN map_point TEXT`);
  } catch (e: any) {
    // Column already exists, ignore
  }
  try {
    await dbRun(`ALTER TABLE location_tags ADD COLUMN map_polygon TEXT`);
  } catch (e: any) {
    // Column already exists, ignore
  }
  try {
    await dbRun(`ALTER TABLE location_tags ADD COLUMN category TEXT`);
  } catch (e: any) {
    // Column already exists, ignore
  }
  try {
    await dbRun(`ALTER TABLE location_tags ADD COLUMN visible INTEGER DEFAULT 1`);
  } catch (e: any) {
    // Column already exists, ignore
  }
  try {
    await dbRun(`ALTER TABLE location_tags ADD COLUMN color TEXT`);
  } catch (e: any) {
    // Column already exists, ignore
  }
  try {
    await dbRun(`ALTER TABLE location_tags ADD COLUMN map_id INTEGER`);
  } catch (e: any) {
    // Column already exists, ignore
  }

  // Remove unused associated_map_id column if it exists (SQLite 3.35.0+)
  try {
    await dbRun(`ALTER TABLE location_tags DROP COLUMN associated_map_id`);
    console.log('Removed unused associated_map_id column from location_tags table');
  } catch (e: any) {
    // Column doesn't exist or SQLite version doesn't support DROP COLUMN
    // This is fine - the column will remain unused in older SQLite versions
  }

  // Position templates
  await dbRun(`
    CREATE TABLE IF NOT EXISTS position_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT,
      duration_hours INTEGER,
      location_id INTEGER,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (location_id) REFERENCES location_tags(id)
    )
  `);

  // Add location_id column to existing position_templates table if it doesn't exist
  try {
    await dbRun(`ALTER TABLE position_templates ADD COLUMN location_id INTEGER`);
  } catch (e: any) {
    // Column already exists, ignore
  }

  // Posted positions
  await dbRun(`
    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT,
      duration_hours INTEGER,
      location_id INTEGER,
      location TEXT,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME,
      max_volunteers INTEGER,
      current_volunteers INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'filled', 'cancelled', 'completed')),
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES position_templates(id),
      FOREIGN KEY (location_id) REFERENCES location_tags(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Volunteer signups
  await dbRun(`
    CREATE TABLE IF NOT EXISTS signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position_id INTEGER NOT NULL,
      volunteer_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
      signed_up_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (position_id) REFERENCES positions(id),
      FOREIGN KEY (volunteer_id) REFERENCES users(id),
      UNIQUE(position_id, volunteer_id)
    )
  `);

  // Requirement tags
  await dbRun(`
    CREATE TABLE IF NOT EXISTS requirement_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Template requirement tags (many-to-many relationship)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS template_requirement_tags (
      template_id INTEGER NOT NULL,
      requirement_tag_id INTEGER NOT NULL,
      PRIMARY KEY (template_id, requirement_tag_id),
      FOREIGN KEY (template_id) REFERENCES position_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (requirement_tag_id) REFERENCES requirement_tags(id) ON DELETE CASCADE
    )
  `);

  // Scheduled posts
  await dbRun(`
    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      cron_expression TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      days_ahead INTEGER DEFAULT 7,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES position_templates(id)
    )
  `);

  // Organization announcements/updates
  await dbRun(`
    CREATE TABLE IF NOT EXISTS organization_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      link TEXT,
      type TEXT NOT NULL CHECK(type IN ('email', 'sms', 'both')),
      cron_expression TEXT,
      is_active INTEGER DEFAULT 1,
      last_sent_at DATETIME,
      next_send_at DATETIME,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Migrate existing announcements: rename message to description and add link column
  try {
    await dbRun(`ALTER TABLE organization_announcements ADD COLUMN description TEXT`);
  } catch (e: any) {
    // Column already exists, ignore
  }
  try {
    await dbRun(`ALTER TABLE organization_announcements ADD COLUMN link TEXT`);
  } catch (e: any) {
    // Column already exists, ignore
  }
  // Migrate data from message to description if needed
  try {
    await dbRun(`UPDATE organization_announcements SET description = message WHERE description IS NULL AND message IS NOT NULL`);
  } catch (e: any) {
    // Migration not needed or already done
  }

  // Google account connections
  await dbRun(`
    CREATE TABLE IF NOT EXISTS google_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_expiry DATETIME,
      calendar_id TEXT,
      calendar_name TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, email)
    )
  `);

  // Calendar forwarding policies
  await dbRun(`
    CREATE TABLE IF NOT EXISTS calendar_forwarding_policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      google_account_id INTEGER NOT NULL,
      target_calendar_id TEXT NOT NULL,
      target_calendar_name TEXT,
      target_email_group TEXT,
      position_template_id INTEGER,
      location_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (google_account_id) REFERENCES google_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (position_template_id) REFERENCES position_templates(id) ON DELETE SET NULL,
      FOREIGN KEY (location_id) REFERENCES location_tags(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Create default admin user if it doesn't exist
  const adminExists = await dbGet("SELECT id FROM users WHERE email = 'admin@park.local'");
  if (!adminExists) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await dbRun(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, 'admin')
    `, ['admin@park.local', passwordHash, 'Park Administrator']);
    console.log('Default admin created: admin@park.local / admin123');
  }

  // Create default volunteer user if it doesn't exist
  const volunteerExists = await dbGet("SELECT id FROM users WHERE LOWER(email) = LOWER('test@t.t')");
  if (!volunteerExists) {
    const passwordHash = await bcrypt.hash('t123', 10);
    await dbRun(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, 'volunteer')
    `, ['test@t.t', passwordHash, 'Test Volunteer']);
    console.log('Default volunteer created: test@t.t / t123');
  }
}

export { getDb as db };

