# Park Volunteer Portal

A full-stack volunteer management system for local parks with administrative controls, position templates, scheduling, and notification capabilities.

## Features

- **Volunteer Dashboard**: View and sign up for available volunteer positions
- **Admin Dashboard**: Manage position templates, post positions, and schedule recurring posts
- **Notifications**: Email and SMS notifications based on volunteer preferences
- **Scheduling**: Automated posting of positions using cron expressions
- **Authentication**: Role-based access (admin/volunteer)
- **Google Calendar Integration**: Connect Google accounts to sync calendar data and automatically forward scheduler output to Google Calendars

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express and TypeScript
- **Database**: SQLite
- **Notifications**: Nodemailer (email) and Twilio (SMS)

## Setup

1. Install dependencies:
```bash
npm run install-all
```

2. Configure environment variables:
```bash
cd server
cp .env.example .env
# Edit .env with your email and Twilio credentials
```

3. Start development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Default Admin Credentials

- Email: `admin@park.local`
- Password: `admin123`

**Important**: Change the default admin password in production!

## Environment Variables

See `server/.env.example` for required configuration:
- `JWT_SECRET`: Secret key for JWT tokens
- `SMTP_*`: Email configuration for notifications
- `TWILIO_*`: Twilio credentials for SMS notifications
- `GOOGLE_CLIENT_ID`: Google OAuth 2.0 Client ID (for Google Calendar integration)
- `GOOGLE_CLIENT_SECRET`: Google OAuth 2.0 Client Secret
- `GOOGLE_REDIRECT_URI`: OAuth redirect URI (default: http://localhost:5000/api/admin/google/callback)
- `CLIENT_URL`: Frontend URL for OAuth redirects (default: http://localhost:3000)

## Usage

### For Admins

1. Login with admin credentials
2. Create position templates in the Templates section
3. Post positions from templates or create scheduled recurring posts
4. Notify volunteers about new positions
5. **Google Calendar Integration**:
   - Navigate to "Google Calendar Integration" in the admin dashboard
   - Connect your Google account(s) to enable calendar features
   - Set up forwarding policies to automatically send scheduler output to specific Google Calendars
   - Sync calendar events to populate the scheduler with existing events

### For Volunteers

1. Register for an account
2. Set notification preferences (email/phone/both)
3. Browse available positions and sign up
4. View your signups in the My Signups section

