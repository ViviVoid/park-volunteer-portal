import cron from 'node-cron';
import { dbAll, dbGet, dbRun } from '../database';
import { notifyVolunteers } from './notifications';
import { salesforceService } from './salesforce';
import { GoogleCalendarService } from './googleCalendar';

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

      // Check for scheduled announcements
      const announcements: any[] = await dbAll(
        'SELECT * FROM organization_announcements WHERE is_active = 1 AND cron_expression IS NOT NULL'
      );

      for (const announcement of announcements) {
        const cronParts = announcement.cron_expression.split(' ');
        if (cronParts.length !== 5) continue;

        const now = new Date();
        const shouldSend = checkCronMatch(cronParts, now);

        if (shouldSend) {
          await sendScheduledAnnouncement(announcement);
        }
      }
    } catch (error) {
      console.error('Error in scheduled cron job:', error);
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

    // Get the created position for forwarding
    const position: any = await dbGet(
      'SELECT * FROM positions WHERE id = ?',
      [result.lastID]
    );

    // Forward to Google Calendars based on policies
    if (position) {
      try {
        await GoogleCalendarService.forwardPositionToCalendars(position);
      } catch (error) {
        console.error('Error forwarding position to Google Calendars:', error);
      }
    }

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

async function sendScheduledAnnouncement(announcement: any) {
  try {
    const volunteers: any[] = await dbAll(
      'SELECT id, email, phone, name, notification_preference FROM users WHERE role = ?',
      ['volunteer']
    );

    const description = announcement.description || announcement.message || ''; // Support both for migration
    const linkText = announcement.link ? `\n\nView document: ${announcement.link}` : '';
    const linkHtml = announcement.link ? `<p style="margin-top: 1rem;"><a href="${announcement.link}" style="color: var(--primary-color); text-decoration: none; font-weight: bold;">View Document →</a></p>` : '';

    // Use Salesforce if connected
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
      }
    }

    // Send via direct notifications
    const nodemailer = require('nodemailer');
    const twilio = require('twilio');

    const emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      : null;

    for (const volunteer of volunteers) {
      const pref = volunteer.notification_preference || 'email';

      if ((announcement.type === 'email' || announcement.type === 'both') && (pref === 'email' || pref === 'both')) {
        if (volunteer.email) {
          try {
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
        if (volunteer.phone && twilioClient) {
          try {
            await twilioClient.messages.create({
              body: `${announcement.title}\n\n${description}${linkText}`,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: volunteer.phone
            });
          } catch (error) {
            console.error(`Failed to send SMS to ${volunteer.phone}:`, error);
          }
        }
      }
    }

    // Update last_sent_at
    await dbRun(
      'UPDATE organization_announcements SET last_sent_at = CURRENT_TIMESTAMP WHERE id = ?',
      [announcement.id]
    );

    console.log(`Sent scheduled announcement: ${announcement.title}`);
  } catch (error) {
    console.error('Error sending scheduled announcement:', error);
  }
}

