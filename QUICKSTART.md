# Quick Start Guide

## Installation

1. Install all dependencies:
```bash
npm run install-all
```

2. Set up environment variables:
```bash
cd server
cp .env.example .env
# Edit .env with your configuration
```

## Running the Application

### Development Mode

Run both frontend and backend:
```bash
npm run dev
```

Or run separately:
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

### Access Points

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Default Admin Account

- **Email**: `admin@park.local`
- **Password**: `admin123`

⚠️ **Important**: Change the default password in production!

## Features Overview

### For Admins

1. **Templates Management**: Create reusable position templates
2. **Post Positions**: Post volunteer positions from templates with dates/times
3. **Scheduled Posts**: Set up recurring posts using cron expressions
4. **Notify Volunteers**: Send notifications to all volunteers about new positions

### For Volunteers

1. **Browse Positions**: View available volunteer opportunities
2. **Sign Up**: Register for positions
3. **Manage Signups**: View and cancel your signups
4. **Preferences**: Set notification preferences (email/phone/both)

## Notification Setup

### Email (SMTP)

Configure in `server/.env`:
- `SMTP_HOST`: Your SMTP server (e.g., smtp.gmail.com)
- `SMTP_PORT`: Port (usually 587)
- `SMTP_USER`: Your email
- `SMTP_PASS`: Your email password or app password
- `SMTP_FROM`: Sender email address

### SMS (Twilio)

Configure in `server/.env`:
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number

Note: Notifications will work even if only email or only SMS is configured.

## Database

The application uses SQLite. The database file (`volunteer_portal.db`) will be created automatically in the server directory on first run.

## Production Deployment

1. Build the frontend:
```bash
npm run build
```

2. Set production environment variables
3. Use a process manager like PM2 for the backend
4. Serve the frontend build with a web server (nginx, Apache, etc.)

