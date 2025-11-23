# Park Volunteer Portal

A full-stack volunteer management system for local parks with administrative controls, position templates, scheduling, and notification capabilities.

## Features

- **Public Map View**: Interactive map accessible to visitors without login, showing public maps with location descriptions
- **Interactive Maps**: Create and manage multiple maps with location tags, points, polygons, and categories
- **Map Visibility Control**: Mark maps as public or private - only public maps are visible to visitors
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

## Default Credentials

### Admin User
- Email: `admin@park.local`
- Password: `admin123`

### Test Volunteer User
- Email: `test@t.t`
- Password: `t123`

**Important**: Change the default passwords in production!

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

### For Visitors

1. Visit the homepage to view the public interactive map
2. Navigate between public maps using the map selector
3. Click on location markers or areas to see descriptions
4. Use the "Admin Login" link to access administrative features

### For Admins

1. Login with admin credentials
2. **Manage Maps**:
   - Create and upload map images
   - Add location tags with points, polygons, or circles
   - Mark maps as public to make them visible to visitors
   - Set default maps and organize map hierarchy
3. Create position templates in the Templates section
4. Post positions from templates or create scheduled recurring posts
5. Notify volunteers about new positions
6. **Google Calendar Integration**:
   - Navigate to "Google Calendar Integration" in the admin dashboard
   - Connect your Google account(s) to enable calendar features
   - Set up forwarding policies to automatically send scheduler output to specific Google Calendars
   - Sync calendar events to populate the scheduler with existing events

### For Volunteers

1. Register for an account or login with volunteer credentials
2. Set notification preferences (email/phone/both)
3. Browse available positions and sign up
4. View your signups in the My Signups section

---

## Milwaukee Domes Proposal

### Training and Onboarding Process for Milwaukee Domes Team Staff

This comprehensive training guide will help Milwaukee Domes staff members learn how to effectively use the Volunteer Portal system to manage volunteers, create positions, and engage with the community.

#### Table of Contents

1. [Getting Started](#getting-started)
2. [Admin Dashboard Overview](#admin-dashboard-overview)
3. [Interactive Map Management](#interactive-map-management)
4. [Position Templates](#position-templates)
5. [Posting Volunteer Positions](#posting-volunteer-positions)
6. [Scheduled Positions](#scheduled-positions)
7. [Volunteer Management](#volunteer-management)
8. [Google Calendar Integration](#google-calendar-integration)
9. [Organization Communications](#organization-communications)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

### Getting Started

#### Initial Access

1. **Obtain Your Admin Credentials**
   - Contact your system administrator to receive your admin account email and temporary password
   - You will be prompted to change your password on first login
   - **Important**: Never share your admin credentials with volunteers or unauthorized personnel

2. **First Login**
   - Navigate to the portal homepage
   - Click "Admin Login" in the top navigation
   - Enter your email and password
   - If prompted, change your password to something secure

3. **Familiarize Yourself with the Interface**
   - The admin dashboard is accessible from the top navigation menu
   - Key sections include:
     - **Admin Dashboard**: Overview and quick actions
     - **Volunteer Management**: Templates, positions, and scheduling
     - **Interactive Map**: Map and location management
     - **Google Calendar Integration**: Calendar sync and forwarding
     - **Organization Communications**: Internal messaging system

#### System Requirements

- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions recommended)
- **Internet Connection**: Stable connection required for all features
- **Permissions**: Admin role required for all administrative functions

---

### Admin Dashboard Overview

The Admin Dashboard is your central hub for managing all aspects of the volunteer program.

#### Navigation Structure

The admin interface includes the following main sections:

1. **Admin Dashboard (Home)**
   - Quick access to all major features
   - System overview and statistics
   - Quick action buttons

2. **Volunteer Management**
   - **Templates Tab**: Create and manage reusable position templates
   - **Positions Tab**: View, create, and manage active volunteer positions
   - **Scheduled Tab**: Set up automated recurring position postings

3. **Interactive Map**
   - Upload and manage map images for the three domes
   - Create location tags (points, polygons, circles)
   - Mark maps as public or private
   - Organize maps by hierarchy

4. **Google Calendar Integration**
   - Connect Google accounts
   - Sync calendar events
   - Set up automatic forwarding of scheduled positions

5. **Organization Communications**
   - Send messages to staff members
   - Manage internal communications

---

### Interactive Map Management

The Interactive Map feature allows you to create visual guides for visitors and volunteers, showing locations within the three domes.

#### Creating a New Map

1. Navigate to **Admin Dashboard** → **Interactive Map**
2. Click **"Create New Map"** or **"Upload Map"**
3. **Upload Map Image**:
   - Click the upload area or drag and drop your map image
   - Supported formats: PNG, JPG, JPEG
   - Recommended size: 2000x2000 pixels or larger for clarity
   - For the three domes, consider creating separate maps for:
     - Show Dome
     - Desert Dome
     - Tropical Dome
     - Or a combined overview map

4. **Map Details**:
   - **Name**: Give your map a descriptive name (e.g., "Show Dome - Main Level")
   - **Description**: Add context about what this map shows
   - **Default Map**: Check this if this should be the first map visitors see
   - **Public Visibility**: Check to make the map visible to visitors without login

5. Click **"Save Map"**

#### Adding Location Tags

Location tags help visitors and volunteers identify specific areas, exhibits, or points of interest.

1. **Select Your Map**: Choose the map you want to add tags to from the map selector
2. **Choose Tag Type**:
   - **Point**: Single location marker (e.g., entrance, information desk)
   - **Polygon**: Area outline (e.g., exhibit space, garden section)
   - **Circle**: Circular area (e.g., event space, gathering area)

3. **Create a Point Tag**:
   - Click **"Add Point"** button
   - Click on the map where you want the marker
   - Fill in the tag details:
     - **Name**: Location name (e.g., "Desert Dome Entrance")
     - **Description**: Detailed information about this location
     - **Category**: Select or create a category (e.g., "Entrance", "Exhibit", "Restroom")
   - Click **"Save Tag"**

4. **Create a Polygon Tag**:
   - Click **"Add Polygon"** button
   - Click multiple points on the map to outline the area
   - Double-click to finish the polygon
   - Fill in tag details as above
   - Click **"Save Tag"**

5. **Create a Circle Tag**:
   - Click **"Add Circle"** button
   - Click and drag on the map to create a circle
   - Adjust the radius as needed
   - Fill in tag details as above
   - Click **"Save Tag"**

#### Managing Location Tags

- **Edit Tags**: Click on an existing tag on the map, then click "Edit" to modify details
- **Delete Tags**: Click on a tag, then click "Delete" (this action cannot be undone)
- **View Tags**: All tags are visible on the map; click any tag to see its details

#### Map Visibility Settings

- **Public Maps**: Visible to all visitors, even without login
  - Use for general visitor information
  - Examples: Main entrance map, dome overview maps
  
- **Private Maps**: Only visible to logged-in admins
  - Use for internal planning or staff-only information
  - Examples: Staff areas, maintenance maps

#### Best Practices for Domes Maps

- Create separate maps for each dome to provide detailed views
- Use consistent categories across all maps (e.g., "Exhibits", "Entrances", "Restrooms")
- Add descriptive text that helps visitors understand what they'll see
- Mark key volunteer meeting points and work areas
- Update maps when exhibits or layouts change

---

### Position Templates

Templates are reusable blueprints for volunteer positions. They save time and ensure consistency when posting similar positions repeatedly.

#### Creating a Template

1. Navigate to **Volunteer Management** → **Templates** tab
2. Click **"Create New Template"**
3. Fill in the template details:

   **Basic Information**:
   - **Title**: Clear, descriptive title (e.g., "Docent - Show Dome Tour Guide")
   - **Description**: Detailed description of the volunteer role
     - What volunteers will do
     - What they'll learn or experience
     - Impact of their work
   - **Requirements**: Any prerequisites or qualifications needed
     - Age requirements
     - Physical capabilities
     - Training requirements
     - Time commitments

   **Position Details**:
   - **Duration (hours)**: Expected time commitment per shift
   - **Location**: Select from existing location tags or create new ones
     - For domes, you might have locations like:
       - "Show Dome - Main Entrance"
       - "Desert Dome - Cactus Garden"
       - "Tropical Dome - Butterfly Exhibit"
   - **Requirement Tags**: Add tags to help volunteers find suitable positions
     - Examples: "Outdoor", "Indoor", "Physical Activity", "Education", "Customer Service"

4. Click **"Save Template"**

#### Managing Templates

- **Edit Template**: Click the "Edit" button next to any template
- **Delete Template**: Click "Delete" (only if no active positions use this template)
- **View Template**: Click on a template to see full details

#### Template Examples for Milwaukee Domes

**Example 1: Docent Tour Guide**
- **Title**: "Docent - Show Dome Tour Guide"
- **Description**: "Lead educational tours through the Show Dome, sharing knowledge about seasonal exhibits and plant collections. Engage with visitors of all ages and answer questions about the conservatory."
- **Requirements**: "Must complete docent training program. Comfortable speaking to groups. Available for 2-hour shifts."
- **Duration**: 2 hours
- **Location**: "Show Dome - Main Entrance"
- **Tags**: "Education", "Customer Service", "Indoor"

**Example 2: Plant Care Volunteer**
- **Title**: "Horticulture Assistant - Desert Dome"
- **Description**: "Assist horticulture staff with plant care, watering, pruning, and maintenance in the Desert Dome. Learn about desert plant species and conservation practices."
- **Requirements**: "Able to stand for extended periods. Comfortable with basic gardening tools. Training provided."
- **Duration**: 3 hours
- **Location**: "Desert Dome - Cactus Garden"
- **Tags**: "Physical Activity", "Education", "Indoor"

**Example 3: Event Support**
- **Title**: "Special Event Volunteer - All Domes"
- **Description**: "Support staff during special events and programs. Tasks may include visitor assistance, activity setup, and crowd management."
- **Requirements**: "Flexible schedule. Comfortable in busy environments. Customer service experience helpful."
- **Duration**: 4 hours
- **Location**: Varies by event
- **Tags**: "Customer Service", "Events", "Flexible"

---

### Posting Volunteer Positions

Once you have templates, you can post actual volunteer positions that volunteers can sign up for.

#### Posting from a Template

1. Navigate to **Volunteer Management** → **Positions** tab
2. Click **"Post New Position"**
3. **Select Template**: Choose a template from the dropdown
   - The form will auto-fill with template information
   - You can modify any fields for this specific posting
4. **Set Date and Time**:
   - **Date**: Select the date for this position
   - **Start Time**: When volunteers should arrive
   - **End Time**: When the shift ends
   - **Number of Volunteers Needed**: How many volunteers you need for this shift
5. **Review Details**: Ensure all information is correct
6. **Optional - Notify Volunteers**:
   - Check "Notify all volunteers" to send email/SMS notifications
   - Only volunteers who have opted in will receive notifications
7. Click **"Post Position"**

#### Creating a One-Time Position (Without Template)

1. Click **"Post New Position"**
2. Leave template selection as "None"
3. Fill in all fields manually (same as template creation)
4. Set date, time, and number of volunteers needed
5. Click **"Post Position"**

#### Managing Active Positions

- **View Positions**: All active positions are listed in the Positions tab
- **View Signups**: Click on a position to see who has signed up
- **Edit Position**: Click "Edit" to modify details (before volunteers sign up)
- **Cancel Position**: Click "Cancel" to remove a position (notify volunteers first)
- **Close Position**: Positions automatically close when the date passes

#### Best Practices for Posting

- **Post in Advance**: Post positions at least 2-4 weeks ahead when possible
- **Be Specific**: Include clear expectations and requirements
- **Set Realistic Numbers**: Don't over-request volunteers; consider actual needs
- **Use Consistent Times**: If possible, use standard shift times (e.g., 9am-12pm, 1pm-4pm)
- **Notify Strategically**: Use the notification feature for new or urgent positions

---

### Scheduled Positions

The scheduling feature allows you to automatically post recurring positions using cron expressions. This is perfect for regular weekly or monthly volunteer shifts.

#### Understanding Cron Expressions

Cron expressions define when positions should be automatically posted. Format: `minute hour day month day-of-week`

**Common Examples**:
- `0 9 * * 1`: Every Monday at 9:00 AM
- `0 10 * * 1,3,5`: Monday, Wednesday, Friday at 10:00 AM
- `0 8 1 * *`: First day of every month at 8:00 AM
- `0 14 * * 0`: Every Sunday at 2:00 PM

**Cron Expression Builder**:
- Use online cron expression generators if you're unsure
- Test your expressions with a future date first

#### Creating a Scheduled Post

1. Navigate to **Volunteer Management** → **Scheduled** tab
2. Click **"Create Scheduled Post"**
3. **Select Template**: Choose the template to use
4. **Cron Expression**: Enter your cron expression
   - Example: `0 9 * * 1` for every Monday at 9 AM
5. **Posting Window**:
   - **Start Date**: When to begin posting (e.g., first Monday of next month)
   - **End Date**: When to stop (optional, leave blank for ongoing)
   - **Days in Advance**: How many days before the shift date to post (e.g., 14 days)
6. **Position Details**:
   - **Start Time**: Time volunteers should arrive
   - **End Time**: When shift ends
   - **Number of Volunteers**: How many needed per shift
7. **Notification Settings**:
   - Check "Notify volunteers" if you want automatic notifications
8. Click **"Save Scheduled Post"**

#### Managing Scheduled Posts

- **View Scheduled Posts**: All active schedules are listed
- **Edit Schedule**: Click "Edit" to modify the schedule
- **Pause Schedule**: Temporarily disable without deleting
- **Delete Schedule**: Remove the schedule (doesn't affect already-posted positions)

#### Example Schedules for Domes

**Weekly Docent Schedule**:
- **Template**: "Docent - Show Dome Tour Guide"
- **Cron**: `0 10 * * 1,3,5` (Mon, Wed, Fri at 10 AM)
- **Days in Advance**: 14
- **Start Time**: 10:00 AM
- **End Time**: 12:00 PM
- **Volunteers Needed**: 2

**Monthly Plant Care**:
- **Template**: "Horticulture Assistant - Desert Dome"
- **Cron**: `0 8 1 * *` (First of month at 8 AM)
- **Days in Advance**: 21
- **Start Time**: 8:00 AM
- **End Time**: 11:00 AM
- **Volunteers Needed**: 3

---

### Volunteer Management

#### Viewing Volunteer Signups

1. Navigate to **Volunteer Management** → **Positions** tab
2. Click on any position to see the list of volunteers who have signed up
3. You can see:
   - Volunteer name and contact information
   - Signup date and time
   - Notification preferences

#### Managing Volunteer Accounts

- **View All Volunteers**: Access the volunteer list (if available in your system)
- **Contact Volunteers**: Use email or phone numbers from their profiles
- **View Volunteer History**: See past positions a volunteer has signed up for

#### Volunteer Communication

- **Position Notifications**: When posting positions, use the "Notify all volunteers" option
- **Direct Contact**: Use contact information from volunteer profiles for direct communication
- **Organization Communications**: Use the Organization Communications feature for staff-to-staff messaging

---

### Google Calendar Integration

The Google Calendar integration allows you to sync your volunteer schedule with Google Calendar and automatically forward scheduled positions to specific calendars.

#### Setting Up Google Calendar Connection

1. Navigate to **Admin Dashboard** → **Google Calendar Integration**
2. Click **"Connect Google Account"**
3. You'll be redirected to Google to authorize the application
4. Sign in with the Google account you want to use
5. Grant permissions for calendar access
6. You'll be redirected back to the portal

#### Managing Connected Accounts

- **View Connected Accounts**: See all Google accounts currently connected
- **Disconnect Account**: Remove a Google account connection if needed
- **Multiple Accounts**: You can connect multiple Google accounts if needed

#### Setting Up Calendar Forwarding

Calendar forwarding automatically sends scheduled position postings to your Google Calendar.

1. **Create Forwarding Policy**:
   - Click **"Create Forwarding Policy"**
   - **Name**: Give the policy a descriptive name (e.g., "Weekly Docent Schedule")
   - **Google Account**: Select which connected account to use
   - **Calendar**: Choose which Google Calendar to forward to
   - **Scheduled Post**: Select which scheduled post to forward
   - **Event Title Format**: Customize how events appear in your calendar
     - Use variables like `{title}`, `{date}`, `{location}`
     - Example: "Volunteer: {title} - {location}"
   - **Event Description**: What to include in the calendar event description
   - Click **"Save Policy"**

2. **Managing Policies**:
   - View all active forwarding policies
   - Edit or delete policies as needed
   - Policies automatically create calendar events when positions are posted

#### Syncing Existing Calendar Events

You can import existing events from your Google Calendar into the scheduler.

1. Click **"Sync Calendar Events"**
2. Select the Google account and calendar
3. Choose date range for events to import
4. Click **"Sync"**
5. Review imported events and adjust as needed

#### Best Practices

- **Use Separate Calendars**: Consider creating a dedicated "Volunteer Schedule" calendar
- **Consistent Naming**: Use clear, consistent event titles for easy identification
- **Regular Syncs**: Periodically sync calendars to keep everything up to date
- **Multiple Policies**: Create different policies for different types of positions

---

### Organization Communications

The Organization Communications feature allows staff members to send messages to each other within the system.

#### Sending Messages

1. Navigate to **Admin Dashboard** → **Organization Communications**
2. Click **"New Message"**
3. **Select Recipients**: Choose staff members to message
4. **Subject**: Enter a clear subject line
5. **Message**: Write your message
6. Click **"Send"**

#### Managing Messages

- **Inbox**: View received messages
- **Sent**: View messages you've sent
- **Reply**: Respond to messages directly
- **Archive**: Organize messages by archiving

---

### Best Practices

#### General Administration

1. **Regular Updates**: Keep position information current and accurate
2. **Clear Communication**: Write clear, detailed descriptions for all positions
3. **Consistent Scheduling**: Use templates and scheduled posts for routine positions
4. **Volunteer Engagement**: Respond promptly to volunteer questions and concerns
5. **Documentation**: Keep notes on what works well and what needs improvement

#### Template Management

- **Create Comprehensive Templates**: Include all relevant information upfront
- **Regular Review**: Periodically review and update templates
- **Categorization**: Use location and requirement tags consistently
- **Seasonal Templates**: Create separate templates for seasonal activities

#### Map Management

- **Keep Maps Current**: Update maps when exhibits or layouts change
- **Clear Labels**: Use descriptive names for all location tags
- **Visitor-Friendly**: Write descriptions that help visitors understand locations
- **Multiple Maps**: Consider separate maps for different detail levels

#### Position Posting

- **Advance Planning**: Post positions well in advance (2-4 weeks minimum)
- **Realistic Expectations**: Set appropriate volunteer numbers and time commitments
- **Clear Instructions**: Provide specific information about what volunteers will do
- **Follow-Up**: Check in with volunteers after their shifts

#### Scheduling

- **Test First**: Test cron expressions with future dates before going live
- **Regular Review**: Periodically review scheduled posts to ensure they're still needed
- **Flexibility**: Be prepared to adjust schedules based on volunteer availability
- **Documentation**: Keep notes on your cron expressions and what they do

#### Volunteer Relations

- **Timely Responses**: Respond to volunteer inquiries within 24-48 hours
- **Appreciation**: Acknowledge and thank volunteers for their contributions
- **Feedback**: Encourage and act on volunteer feedback
- **Clear Expectations**: Set and communicate clear expectations for all positions

---

### Troubleshooting

#### Common Issues and Solutions

**Problem: Can't log in**
- **Solution**: Verify you're using the correct email and password
- Contact system administrator if password reset is needed
- Clear browser cache and cookies, then try again

**Problem: Map image won't upload**
- **Solution**: Check file format (PNG, JPG, JPEG only)
- Ensure file size is reasonable (under 10MB recommended)
- Try a different browser or clear cache

**Problem: Location tags not saving**
- **Solution**: Ensure you've filled in all required fields (name, description)
- Check that you've selected a map first
- Try refreshing the page and creating the tag again

**Problem: Scheduled posts not appearing**
- **Solution**: Verify the cron expression is correct
- Check that the start date has passed
- Ensure "Days in Advance" setting allows enough time
- Review the scheduled post settings

**Problem: Volunteers not receiving notifications**
- **Solution**: Verify notification settings are enabled when posting
- Check that volunteers have opted in to notifications in their profiles
- Verify email/SMS configuration in system settings (contact administrator)

**Problem: Google Calendar not syncing**
- **Solution**: Reconnect your Google account
- Verify calendar permissions were granted
- Check that the forwarding policy is active
- Ensure the scheduled post is still active

**Problem: Template not appearing in dropdown**
- **Solution**: Verify the template was saved successfully
- Refresh the page
- Check that you're in the correct section (Templates vs Positions)

#### Getting Help

1. **Documentation**: Refer to this training guide first
2. **System Administrator**: Contact your system administrator for technical issues
3. **Support Team**: Reach out to the development/support team for system bugs or feature requests
4. **Staff Collaboration**: Ask other staff members who are experienced with the system

#### Reporting Issues

When reporting problems, include:
- **What you were trying to do**: Describe the action
- **What happened**: Describe the error or unexpected behavior
- **When it occurred**: Date and time
- **Screenshots**: If possible, include screenshots of error messages
- **Browser Information**: Which browser and version you're using

---

### Training Checklist

Use this checklist to track your progress through the training:

- [ ] Successfully logged into the admin dashboard
- [ ] Explored all main navigation sections
- [ ] Created at least one map and added location tags
- [ ] Created at least one position template
- [ ] Posted a volunteer position from a template
- [ ] Created a scheduled post (if applicable)
- [ ] Connected a Google account (if using calendar integration)
- [ ] Sent a test message via Organization Communications
- [ ] Reviewed volunteer signups for a position
- [ ] Understood notification settings and preferences
- [ ] Read through best practices section
- [ ] Know who to contact for help

---

### Additional Resources

- **System Documentation**: Refer to the main README for technical details
- **Quick Start Guide**: See QUICKSTART.md for setup information
- **Milwaukee Domes Analysis**: Review milwaukee-domes-proposal/milwaukee-domes-analysis.md for system capabilities
- **Post-Project Timeline**: See milwaukee-domes-proposal/post-project-timeline.md for future features

---

### Questions or Need Help?

If you have questions or need assistance:
1. Review the relevant section of this training guide
2. Check the troubleshooting section
3. Contact your system administrator
4. Reach out to the support team

**Remember**: It's normal to need time to become comfortable with a new system. Take your time, practice with test data, and don't hesitate to ask for help!

---

*Last Updated: [Current Date]*
*Version: 1.0*

