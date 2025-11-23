import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import bcrypt from 'bcryptjs';

const db = new sqlite3.Database('./volunteer_portal.db');

// Custom dbRun wrapper to preserve lastID
export function dbRun(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params || [], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

export const dbGet = promisify(db.get.bind(db));
export const dbAll = promisify(db.all.bind(db));

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
}

export { db };

