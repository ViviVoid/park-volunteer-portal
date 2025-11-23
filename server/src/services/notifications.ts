import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { dbAll } from '../database';

// Email transporter (configure with your email service)
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Twilio client (configure with your Twilio credentials)
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export async function notifyVolunteers(data: {
  positionId: number;
  title: string;
  date: string;
  start_time: string;
  location?: string;
}) {
  try {
    // Get all volunteers
    const volunteers: any[] = await dbAll(
      'SELECT id, email, phone, name, notification_preference FROM users WHERE role = ?',
      ['volunteer']
    );

    const message = `New volunteer opportunity: ${data.title}\n` +
      `Date: ${data.date}\n` +
      `Time: ${data.start_time}\n` +
      (data.location ? `Location: ${data.location}\n` : '') +
      `\nSign up at the volunteer portal!`;

    const emailHtml = `
      <h2>New Volunteer Opportunity</h2>
      <p><strong>${data.title}</strong></p>
      <p><strong>Date:</strong> ${data.date}</p>
      <p><strong>Time:</strong> ${data.start_time}</p>
      ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ''}
      <p>Sign up at the volunteer portal!</p>
    `;

    for (const volunteer of volunteers) {
      const pref = volunteer.notification_preference || 'email';

      // Send email if preference includes email
      if (pref === 'email' || pref === 'both') {
        if (volunteer.email) {
          try {
            await emailTransporter.sendMail({
              from: process.env.SMTP_FROM || 'noreply@park.local',
              to: volunteer.email,
              subject: `New Volunteer Opportunity: ${data.title}`,
              text: message,
              html: emailHtml
            });
          } catch (error) {
            console.error(`Failed to send email to ${volunteer.email}:`, error);
          }
        }
      }

      // Send SMS if preference includes phone
      if (pref === 'phone' || pref === 'both') {
        if (volunteer.phone && twilioClient) {
          try {
            await twilioClient.messages.create({
              body: message,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: volunteer.phone
            });
          } catch (error) {
            console.error(`Failed to send SMS to ${volunteer.phone}:`, error);
          }
        }
      }
    }

    return { success: true, notified: volunteers.length };
  } catch (error) {
    console.error('Error notifying volunteers:', error);
    throw error;
  }
}

