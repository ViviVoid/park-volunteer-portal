# Google Calendar Integration Setup Guide

This guide will help you set up Google Calendar integration for the Park Volunteer Portal.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. A GCP project with the Google Calendar API enabled

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required information (App name, User support email, Developer contact)
   - Add scopes: `https://www.googleapis.com/auth/calendar.readonly`, `https://www.googleapis.com/auth/calendar.events`, `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/userinfo.profile`
   - Add test users (your admin email) if in testing mode
   - Save and continue
4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: "Park Volunteer Portal" (or your preferred name)
   - Authorized redirect URIs:
     - `http://localhost:5000/api/admin/google/callback` (for development)
     - `https://yourdomain.com/api/admin/google/callback` (for production)
   - Click **Create**
5. Copy the **Client ID** and **Client Secret**

## Step 4: Configure Environment Variables

Add the following to your `server/.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/admin/google/callback
CLIENT_URL=http://localhost:3000
```

For production, update the redirect URI and client URL to match your domain:

```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/admin/google/callback
CLIENT_URL=https://yourdomain.com
```

## Step 5: Using Google Calendar Integration

### Connecting a Google Account

1. Log in as an admin
2. Navigate to **Google Calendar Integration** in the admin dashboard
3. Click **+ Connect Google Account**
4. You'll be redirected to Google to authorize the application
5. Grant the requested permissions
6. You'll be redirected back to the portal

### Setting Up a Primary Calendar

1. After connecting an account, click **Manage Calendars** on the account
2. Select a calendar from the list
3. Click **Set as Primary** to use it as the default calendar

### Creating Forwarding Policies

Forwarding policies automatically send scheduler output to specific Google Calendars:

1. Go to the **Forwarding Policies** tab
2. Click **+ Create Forwarding Policy**
3. Configure the policy:
   - **Policy Name**: A descriptive name for the policy
   - **Google Account**: Select the connected account
   - **Target Calendar ID**: The calendar ID (email address) where events should be forwarded
   - **Target Calendar Name**: A friendly name for the calendar
   - **Filter by Template** (optional): Only forward positions from specific templates
   - **Filter by Location** (optional): Only forward positions from specific locations
   - **Email Group** (optional): Comma-separated list of emails to invite to calendar events
4. Click **Create Policy**

### Syncing Calendar Events

1. In the **Google Accounts** tab, click **Sync Events** on a connected account
2. The system will scan the primary calendar for events that might be relevant for volunteer positions
3. Events containing keywords like "volunteer", "shift", "position", etc. will be identified

## How It Works

### Automatic Forwarding

When a position is created (either manually or via the scheduler), the system:

1. Checks all active forwarding policies
2. Matches the position against policy filters (template, location)
3. Creates calendar events in the target calendars specified by matching policies
4. Optionally invites email groups to the events

### Calendar Event Details

Forwarded events include:
- Position title as the event summary
- Position description and requirements in the event description
- Start and end times from the position
- Location information
- Invited attendees (if email group is specified)

## Troubleshooting

### "Failed to refresh access token"

- The refresh token may have been revoked
- Disconnect and reconnect the Google account

### "Failed to create calendar event"

- Verify the target calendar ID is correct
- Ensure the Google account has write access to the target calendar
- Check that the calendar exists and is accessible

### OAuth redirect errors

- Verify the redirect URI in your Google Cloud Console matches exactly with `GOOGLE_REDIRECT_URI` in your `.env`
- Ensure the redirect URI is added to authorized redirect URIs in OAuth credentials

### Calendar not appearing in list

- Ensure the Google account has access to the calendar
- Check that the calendar is not deleted or hidden

## Security Notes

- Store OAuth credentials securely in environment variables
- Never commit `.env` files to version control
- Regularly rotate OAuth credentials
- Use HTTPS in production for OAuth redirects
- Review and limit OAuth scopes to only what's necessary

## API Scopes Used

The integration requires the following Google API scopes:
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar events
- `https://www.googleapis.com/auth/calendar.events` - Create and manage calendar events
- `https://www.googleapis.com/auth/userinfo.email` - Get user email
- `https://www.googleapis.com/auth/userinfo.profile` - Get user profile information

