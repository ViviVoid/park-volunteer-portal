import cron from 'node-cron';
import { dbAll, dbGet, dbRun } from '../database';
import { notifyVolunteers } from './notifications';

export function setupCronJobs() {
  // Check for scheduled posts every minute
  cron.schedule('* * * * *', async () => {
    try {
      const scheduledPosts: any[] = await dbAll(
        'SELECT * FROM scheduled_posts WHERE is_active = 1'
      );

      for (const scheduled of scheduledPosts) {
        // Parse cron expression and check if it's time to post
        const cronParts = scheduled.cron_expression.split(' ');
        if (cronParts.length !== 5) continue;

        // Simple cron check (this is a simplified version)
        // For production, use a proper cron parser
        const now = new Date();
        const shouldPost = checkCronMatch(cronParts, now);

        if (shouldPost) {
          await createScheduledPosition(scheduled);
        }
      }
    } catch (error) {
      console.error('Error in scheduled posts cron job:', error);
    }
  });
}

function checkCronMatch(cronParts: string[], date: Date): boolean {
  // Simplified cron matching - for production use a library like node-cron
  // This checks if current time matches the cron expression
  const [minute, hour, day, month, weekday] = cronParts;
  
  // Check if current time matches
  if (minute !== '*' && parseInt(minute) !== date.getMinutes()) return false;
  if (hour !== '*' && parseInt(hour) !== date.getHours()) return false;
  if (day !== '*' && parseInt(day) !== date.getDate()) return false;
  if (month !== '*' && parseInt(month) !== date.getMonth() + 1) return false;
  
  return true;
}

async function createScheduledPosition(scheduled: any) {
  try {
    const template: any = await dbGet(
      'SELECT * FROM position_templates WHERE id = ?',
      [scheduled.template_id]
    );

    if (!template) return;

    // Calculate date (days_ahead from now)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + scheduled.days_ahead);
    const dateStr = targetDate.toISOString().split('T')[0];

    // Default time (can be customized)
    const startTime = '09:00';
    const endTime = '17:00';

    // Create position
    const result: any = await dbRun(
      `INSERT INTO positions (template_id, title, description, requirements, duration_hours, location, date, start_time, end_time, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scheduled.template_id,
        template.title,
        template.description,
        template.requirements,
        template.duration_hours,
        template.location,
        dateStr,
        startTime,
        endTime,
        1 // Default admin user
      ]
    );

    // Notify volunteers
    await notifyVolunteers({
      positionId: result.lastID,
      title: template.title,
      date: dateStr,
      start_time: startTime,
      location: template.location
    });

    console.log(`Created scheduled position from template ${template.title}`);
  } catch (error) {
    console.error('Error creating scheduled position:', error);
  }
}

