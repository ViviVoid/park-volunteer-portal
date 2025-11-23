import { google } from 'googleapis';
import { GoogleAuthService } from './googleAuth';
import { dbGet, dbAll, dbRun } from '../database';

export class GoogleCalendarService {
  /**
   * List all calendars for a Google account
   */
  static async listCalendars(accountId: number): Promise<any[]> {
    try {
      const oauth2Client = await GoogleAuthService.getOAuth2Client(accountId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const response = await calendar.calendarList.list();
      const calendars = response.data.items || [];

      return calendars.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary || false,
        accessRole: cal.accessRole
      }));
    } catch (error: any) {
      console.error('Error listing calendars:', error);
      throw new Error(`Failed to list calendars: ${error.message}`);
    }
  }

  /**
   * Set primary calendar for a Google account
   */
  static async setPrimaryCalendar(accountId: number, calendarId: string, calendarName: string): Promise<void> {
    await dbRun(
      'UPDATE google_accounts SET calendar_id = ?, calendar_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [calendarId, calendarName, accountId]
    );
  }

  /**
   * Get events from a Google Calendar within a date range
   */
  static async getCalendarEvents(
    accountId: number,
    calendarId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<any[]> {
    try {
      const oauth2Client = await GoogleAuthService.getOAuth2Client(accountId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      return events.map(event => ({
        id: event.id,
        summary: event.summary || '',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        location: event.location || '',
        attendees: event.attendees || []
      }));
    } catch (error: any) {
      console.error('Error getting calendar events:', error);
      throw new Error(`Failed to get calendar events: ${error.message}`);
    }
  }

  /**
   * Create an event in a Google Calendar
   */
  static async createCalendarEvent(
    accountId: number,
    calendarId: string,
    eventData: {
      summary: string;
      description?: string;
      start: { dateTime: string; timeZone?: string } | { date: string };
      end: { dateTime: string; timeZone?: string } | { date: string };
      location?: string;
      attendees?: string[];
    }
  ): Promise<any> {
    try {
      const oauth2Client = await GoogleAuthService.getOAuth2Client(accountId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const event: any = {
        summary: eventData.summary,
        description: eventData.description || '',
        start: eventData.start,
        end: eventData.end,
        location: eventData.location || ''
      };

      if (eventData.attendees && eventData.attendees.length > 0) {
        event.attendees = eventData.attendees.map(email => ({ email }));
      }

      const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: event
      });

      return {
        id: response.data.id,
        htmlLink: response.data.htmlLink,
        summary: response.data.summary,
        start: response.data.start,
        end: response.data.end
      };
    } catch (error: any) {
      console.error('Error creating calendar event:', error);
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }
  }

  /**
   * Forward a position to Google Calendar based on policies
   */
  static async forwardPositionToCalendars(position: any): Promise<void> {
    try {
      // Get all active forwarding policies
      const policies: any[] = await dbAll(
        `SELECT cp.*, ga.email as account_email, ga.calendar_id as account_calendar_id
         FROM calendar_forwarding_policies cp
         JOIN google_accounts ga ON cp.google_account_id = ga.id
         WHERE cp.is_active = 1 AND ga.is_active = 1`
      );

      for (const policy of policies) {
        // Check if policy matches this position
        if (policy.position_template_id && policy.position_template_id !== position.template_id) {
          continue;
        }
        if (policy.location_id && policy.location_id !== position.location_id) {
          continue;
        }

        // Determine target calendar
        const targetCalendarId = policy.target_calendar_id || policy.account_calendar_id;
        if (!targetCalendarId) {
          console.warn(`Policy ${policy.id} has no target calendar`);
          continue;
        }

        // Create event
        const startDateTime = new Date(`${position.date}T${position.start_time}`);
        const endDateTime = position.end_time 
          ? new Date(`${position.date}T${position.end_time}`)
          : new Date(startDateTime.getTime() + (position.duration_hours || 4) * 60 * 60 * 1000);

        const eventData = {
          summary: position.title,
          description: `${position.description}\n\nRequirements: ${position.requirements || 'None'}\nLocation: ${position.location || 'TBD'}`,
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          location: position.location || '',
          attendees: policy.target_email_group ? policy.target_email_group.split(',').map((e: string) => e.trim()) : []
        };

        try {
          await this.createCalendarEvent(
            policy.google_account_id,
            targetCalendarId,
            eventData
          );
          console.log(`Forwarded position ${position.id} to calendar ${targetCalendarId} via policy ${policy.id}`);
        } catch (error: any) {
          console.error(`Failed to forward position ${position.id} via policy ${policy.id}:`, error);
        }
      }
    } catch (error: any) {
      console.error('Error forwarding position to calendars:', error);
    }
  }

  /**
   * Sync calendar events to populate scheduler
   */
  static async syncCalendarEventsForScheduler(accountId: number, daysAhead: number = 30): Promise<any[]> {
    try {
      const account: any = await dbGet(
        'SELECT * FROM google_accounts WHERE id = ? AND is_active = 1',
        [accountId]
      );

      if (!account || !account.calendar_id) {
        throw new Error('Account not found or no primary calendar set');
      }

      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + daysAhead);

      const events = await this.getCalendarEvents(accountId, account.calendar_id, now, future);
      
      // Filter events that might be relevant for volunteer positions
      // This is a simple heuristic - you might want to customize this
      return events.filter(event => {
        const summary = (event.summary || '').toLowerCase();
        // Look for keywords that might indicate volunteer opportunities
        const keywords = ['volunteer', 'shift', 'position', 'help', 'event', 'activity'];
        return keywords.some(keyword => summary.includes(keyword));
      });
    } catch (error: any) {
      console.error('Error syncing calendar events:', error);
      throw new Error(`Failed to sync calendar events: ${error.message}`);
    }
  }
}

