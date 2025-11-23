# Salesforce Integration Documentation

This guide documents the Salesforce integration for the Park Volunteer Portal, including setup, usage, and implementation details.

## Overview

The Salesforce integration enables the portal to sync volunteer contacts to Salesforce and create marketing campaigns (email and SMS) through Salesforce Marketing Cloud. This integration allows organizations to leverage Salesforce's powerful CRM and marketing automation capabilities while managing volunteers through the portal.

**Current Status**: The integration is implemented as a **mock service** for MVP demonstration purposes. In production, this would connect to the actual Salesforce API.

## Architecture

### Components

1. **Salesforce Service** (`server/src/services/salesforce.ts`)
   - Core service handling Salesforce API interactions
   - Contact synchronization
   - Campaign creation and management
   - Analytics and tracking

2. **API Routes** (`server/src/routes/admin.ts`)
   - `/api/admin/salesforce/connect` - Connect to Salesforce
   - `/api/admin/salesforce/status` - Get connection status

3. **Frontend Integration** (`client/src/pages/admin/OrganizationCommunications.tsx`)
   - UI for connecting to Salesforce
   - Status display
   - Campaign management interface

4. **Scheduler Integration** (`server/src/services/scheduler.ts`)
   - Automatic campaign creation when sending announcements
   - Fallback to direct notifications if Salesforce is unavailable

## Features

### Contact Management

- **Sync Volunteers to Salesforce**: Automatically syncs volunteer information from the portal database to Salesforce Contacts
- **Contact Mapping**: Maps volunteer data to Salesforce Contact fields:
  - Email → Contact Email
  - Phone → Contact Phone
  - Name → Contact Name (split into FirstName/LastName)
  - Notification Preferences → Contact Preferences

### Campaign Management

- **Email Campaigns**: Create email campaigns in Salesforce Marketing Cloud
- **SMS Campaigns**: Create SMS campaigns for text message communications
- **Scheduled Campaigns**: Support for scheduled campaign delivery
- **Campaign Analytics**: Track sent, delivered, and failed message counts

### Automatic Integration

- When Salesforce is connected, organization announcements automatically create campaigns in Salesforce
- Falls back to direct notifications if Salesforce is unavailable or encounters errors

## Current Implementation (Mock Mode)

The current implementation is a mock service that simulates Salesforce API calls without actually connecting to Salesforce. This allows for:

- **Development and Testing**: Test the integration flow without Salesforce credentials
- **MVP Demonstration**: Show how the integration would work in production
- **UI/UX Validation**: Validate the user interface and user experience

### Mock Behavior

- **Connection**: Accepts any non-empty API key as valid
- **Contact Sync**: Stores contacts in memory (not persisted)
- **Campaigns**: Creates mock campaigns with simulated IDs
- **Delivery**: Simulates 90% delivery success rate
- **Analytics**: Provides mock statistics

## Production Implementation

To implement the actual Salesforce integration, you would need to:

### 1. Salesforce Setup

1. **Create a Salesforce Org** (if you don't have one)
   - Sign up at [salesforce.com](https://www.salesforce.com)
   - Choose the appropriate edition (Sales Cloud, Marketing Cloud, etc.)

2. **Enable Marketing Cloud** (for email/SMS campaigns)
   - Set up Marketing Cloud account
   - Configure email and SMS channels
   - Obtain API credentials

3. **Create a Connected App** (for API access)
   - Navigate to Setup → App Manager → New Connected App
   - Configure OAuth settings:
     - Callback URL: `https://yourdomain.com/api/admin/salesforce/callback`
     - OAuth Scopes: `Full access (full)`, `Manage user data via APIs (api)`
   - Enable OAuth Settings
   - Save and note the Consumer Key and Consumer Secret

4. **Set Up API User**
   - Create a dedicated API user in Salesforce
   - Assign appropriate permissions
   - Generate security token

### 2. Required Salesforce APIs

- **Salesforce REST API**: For Contact management
- **Marketing Cloud API**: For email and SMS campaigns
- **OAuth 2.0**: For authentication

### 3. Environment Variables

Add the following to `server/.env`:

```env
# Salesforce Configuration
SALESFORCE_CLIENT_ID=your-consumer-key
SALESFORCE_CLIENT_SECRET=your-consumer-secret
SALESFORCE_USERNAME=api-user@yourorg.com
SALESFORCE_PASSWORD=your-password
SALESFORCE_SECURITY_TOKEN=your-security-token
SALESFORCE_LOGIN_URL=https://login.salesforce.com
SALESFORCE_INSTANCE_URL=https://yourinstance.salesforce.com

# Marketing Cloud Configuration (if using Marketing Cloud)
MARKETING_CLIENT_ID=your-marketing-cloud-client-id
MARKETING_CLIENT_SECRET=your-marketing-cloud-client-secret
MARKETING_AUTH_BASE_URI=https://your-subdomain.auth.marketingcloudapis.com
MARKETING_REST_BASE_URI=https://your-subdomain.rest.marketingcloudapis.com
```

### 4. Code Changes Required

Replace the mock implementation in `server/src/services/salesforce.ts` with actual Salesforce API calls:

#### Authentication

```typescript
async connect(apiKey: string): Promise<boolean> {
  // Use OAuth 2.0 Username-Password flow or JWT Bearer flow
  const response = await fetch(`${SALESFORCE_LOGIN_URL}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: SALESFORCE_CLIENT_ID,
      client_secret: SALESFORCE_CLIENT_SECRET,
      username: SALESFORCE_USERNAME,
      password: SALESFORCE_PASSWORD + SALESFORCE_SECURITY_TOKEN
    })
  });
  
  const data = await response.json();
  this.accessToken = data.access_token;
  this.instanceUrl = data.instance_url;
  this.isConnected = true;
  return true;
}
```

#### Contact Sync

```typescript
async syncContacts(volunteers: Array<{...}>): Promise<{ synced: number; errors: number }> {
  // Use Salesforce REST API to create/update Contacts
  const response = await fetch(
    `${this.instanceUrl}/services/data/v57.0/sobjects/Contact/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Email: volunteer.email,
        FirstName: volunteer.firstName,
        LastName: volunteer.lastName,
        Phone: volunteer.phone,
        // ... other fields
      })
    }
  );
  // Handle response and errors
}
```

#### Campaign Creation

```typescript
async createEmailCampaign(data: {...}): Promise<SalesforceCampaign> {
  // Use Marketing Cloud API to create email campaigns
  // Implementation depends on Marketing Cloud API version
}
```

## Usage Guide

### Connecting to Salesforce

1. **Navigate to Organization Communications**
   - Log in as an admin
   - Go to **Admin Dashboard** → **Organization Communications**

2. **Connect Salesforce**
   - Click **"Connect Salesforce"** button
   - Enter your Salesforce API key
   - Click **"Connect"**
   - The system will:
     - Validate the connection
     - Sync existing volunteers to Salesforce Contacts
     - Display connection status

3. **View Connection Status**
   - The status panel shows:
     - Connection status (Connected/Not Connected)
     - Number of synced contacts
     - Number of campaigns created
     - Note about mock mode (in current implementation)

### Automatic Campaign Creation

When Salesforce is connected, creating and sending organization announcements automatically:

1. **Creates Campaigns in Salesforce**
   - Email campaigns for email announcements
   - SMS campaigns for SMS announcements
   - Both types for "both" announcements

2. **Syncs Contact Preferences**
   - Respects volunteer notification preferences
   - Only sends to contacts who have opted in

3. **Tracks Campaign Performance**
   - Records sent, delivered, and failed counts
   - Provides analytics for campaign effectiveness

### Manual Contact Sync

Contacts are automatically synced when:
- Salesforce is first connected
- New volunteers register (if implemented)
- Volunteer information is updated (if implemented)

To manually trigger a sync, you would need to:
1. Disconnect and reconnect Salesforce, or
2. Implement a manual sync endpoint (not currently available)

## API Reference

### POST `/api/admin/salesforce/connect`

Connect to Salesforce and sync contacts.

**Request Body:**
```json
{
  "api_key": "your-salesforce-api-key"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connected to Salesforce (Mock Mode)",
  "contactsSynced": 15,
  "note": "This is a mock implementation for MVP demonstration"
}
```

**Errors:**
- `400`: Invalid API key or connection failed
- `500`: Server error during connection

### GET `/api/admin/salesforce/status`

Get current Salesforce connection status.

**Response:**
```json
{
  "connected": true,
  "contactCount": 15,
  "campaignCount": 3,
  "note": "Mock Salesforce integration active"
}
```

## Data Models

### SalesforceContact

```typescript
interface SalesforceContact {
  id: string;                    // Salesforce Contact ID
  email: string;                  // Contact email address
  phone?: string;                 // Contact phone number
  name: string;                   // Full name
  firstName: string;              // First name
  lastName: string;               // Last name
  preferences?: {
    email: boolean;               // Email notification preference
    sms: boolean;                 // SMS notification preference
  };
}
```

### SalesforceCampaign

```typescript
interface SalesforceCampaign {
  id: string;                     // Campaign ID
  name: string;                   // Campaign name
  type: 'email' | 'sms' | 'both'; // Campaign type
  subject?: string;               // Email subject (for email campaigns)
  message: string;                // Campaign message content
  scheduledAt?: string;           // ISO timestamp for scheduled campaigns
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  sentCount: number;              // Number of messages sent
  deliveredCount: number;         // Number of messages delivered
  openedCount?: number;           // Number of emails opened (email only)
  clickedCount?: number;          // Number of links clicked (email only)
}
```

## Integration Flow

### Connection Flow

```
1. Admin clicks "Connect Salesforce"
2. Enters API key in modal
3. Frontend sends POST /api/admin/salesforce/connect
4. Backend validates API key
5. Backend connects to Salesforce (or simulates connection)
6. Backend syncs existing volunteers to Salesforce Contacts
7. Backend returns success response
8. Frontend updates status display
```

### Campaign Creation Flow

```
1. Admin creates organization announcement
2. Admin sends announcement (or scheduler triggers)
3. System checks if Salesforce is connected
4. If connected:
   a. Creates email campaign (if email/both)
   b. Creates SMS campaign (if sms/both)
   c. Sends campaign to appropriate contacts
5. If not connected or error:
   a. Falls back to direct notifications (email/SMS)
6. System logs campaign results
```

## Security Considerations

### Current Implementation (Mock)

- API keys are accepted but not validated
- No actual external API calls are made
- Data is stored in memory (not persisted)

### Production Implementation

1. **API Key Storage**
   - Store Salesforce credentials securely in environment variables
   - Never commit credentials to version control
   - Use secure key management services (AWS Secrets Manager, Azure Key Vault, etc.)

2. **OAuth 2.0**
   - Use OAuth 2.0 for authentication instead of API keys
   - Implement token refresh mechanism
   - Store refresh tokens securely

3. **Data Privacy**
   - Ensure compliance with data protection regulations (GDPR, CCPA)
   - Only sync data that volunteers have consented to share
   - Implement data deletion capabilities

4. **API Rate Limiting**
   - Respect Salesforce API rate limits
   - Implement retry logic with exponential backoff
   - Monitor API usage

5. **Error Handling**
   - Don't expose sensitive error messages to frontend
   - Log errors securely
   - Implement graceful fallbacks

## Troubleshooting

### Connection Issues

**Problem**: "Failed to connect to Salesforce"

**Solutions**:
- Verify API key is correct (in production)
- Check network connectivity
- Verify Salesforce org is accessible
- Check API user permissions
- Review server logs for detailed error messages

**Problem**: "Salesforce API not connected"

**Solutions**:
- Ensure connection was successful
- Check connection status via `/api/admin/salesforce/status`
- Reconnect if necessary

### Sync Issues

**Problem**: Contacts not syncing

**Solutions**:
- Verify Salesforce connection is active
- Check volunteer data format
- Review error logs for specific contact sync failures
- Ensure API user has permission to create Contacts

**Problem**: Duplicate contacts in Salesforce

**Solutions**:
- Implement duplicate detection logic
- Use Salesforce's duplicate matching rules
- Update existing contacts instead of creating new ones

### Campaign Issues

**Problem**: Campaigns not being created

**Solutions**:
- Verify Salesforce connection
- Check Marketing Cloud configuration (if using)
- Review campaign creation logs
- Ensure proper API permissions

**Problem**: Low delivery rates

**Solutions**:
- Verify contact email/phone numbers are valid
- Check contact preferences (opt-in status)
- Review Salesforce delivery logs
- Verify Marketing Cloud configuration

## Best Practices

### Contact Management

1. **Regular Syncs**: Periodically sync contacts to keep Salesforce up to date
2. **Data Quality**: Ensure volunteer data is clean and accurate before syncing
3. **Consent Management**: Only sync contacts who have opted in
4. **Duplicate Prevention**: Implement logic to prevent duplicate contacts

### Campaign Management

1. **Segmentation**: Use Salesforce's segmentation features to target appropriate audiences
2. **Testing**: Test campaigns before sending to all contacts
3. **Analytics**: Regularly review campaign analytics to improve effectiveness
4. **Compliance**: Ensure campaigns comply with email/SMS regulations (CAN-SPAM, TCPA)

### Integration Maintenance

1. **Monitoring**: Monitor API usage and error rates
2. **Updates**: Keep Salesforce API libraries updated
3. **Documentation**: Document any customizations or configurations
4. **Backup**: Have fallback notification methods if Salesforce is unavailable

## Future Enhancements

Potential improvements for the Salesforce integration:

1. **Real-time Sync**: Sync contacts in real-time as volunteers register or update profiles
2. **Bidirectional Sync**: Sync data from Salesforce back to the portal
3. **Advanced Segmentation**: Use Salesforce's advanced segmentation for targeted campaigns
4. **A/B Testing**: Integrate A/B testing capabilities for campaigns
5. **Custom Fields**: Support custom Salesforce fields and objects
6. **Webhooks**: Implement webhooks for real-time updates from Salesforce
7. **Reporting Dashboard**: Create a dashboard showing Salesforce campaign analytics
8. **Lead Management**: Convert volunteer inquiries to Salesforce Leads
9. **Event Tracking**: Track volunteer events and activities in Salesforce
10. **Integration with Other Salesforce Products**: Integrate with Service Cloud, Community Cloud, etc.

## Related Documentation

- [README.md](README.md) - Main project documentation
- [GOOGLE_SETUP.md](GOOGLE_SETUP.md) - Google Calendar integration setup
- [Organization Communications Feature](../README.md#organization-communications) - Announcement system documentation

## Support

For issues or questions about the Salesforce integration:

1. Check this documentation first
2. Review server logs for error messages
3. Verify Salesforce configuration
4. Contact your system administrator
5. Reach out to the development team

---

**Last Updated**: [Current Date]  
**Version**: 1.0  
**Status**: Mock Implementation (MVP)

