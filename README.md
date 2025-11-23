# Park Volunteer Portal

A full-stack volunteer management system for local parks with administrative controls, position templates, scheduling, and notification capabilities.

## Features

- **Volunteer Dashboard**: View and sign up for available volunteer positions
- **Admin Dashboard**: Manage position templates, post positions, and schedule recurring posts
- **Notifications**: Email and SMS notifications based on volunteer preferences
- **Scheduling**: Automated posting of positions using cron expressions
- **Authentication**: Role-based access (admin/volunteer)

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

## Usage

### For Admins

1. Login with admin credentials
2. Create position templates in the Templates section
3. Post positions from templates or create scheduled recurring posts
4. Notify volunteers about new positions

### For Volunteers

1. Register for an account
2. Set notification preferences (email/phone/both)
3. Browse available positions and sign up
4. View your signups in the My Signups section

