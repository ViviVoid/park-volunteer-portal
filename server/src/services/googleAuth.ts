import { google } from 'googleapis';
import { dbGet, dbRun, dbAll } from '../database';

// Validate Google OAuth environment variables
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/admin/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error(
      'Google OAuth credentials are missing. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Lazy initialization - create client when needed
let oauth2Client: ReturnType<typeof getOAuth2Client> | null = null;

function getOrCreateOAuth2Client() {
  if (!oauth2Client) {
    oauth2Client = getOAuth2Client();
  }
  return oauth2Client;
}

export class GoogleAuthService {
  /**
   * Get OAuth2 authorization URL
   */
  static getAuthUrl(userId: number): string {
    const client = getOrCreateOAuth2Client();
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code: string, state: string): Promise<{ userId: number; email: string }> {
    try {
      const client = getOrCreateOAuth2Client();
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      const userId = decodedState.userId;

      const { tokens } = await client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('Failed to get access token');
      }

      // Get user info
      client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const userInfo = await oauth2.userinfo.get();
      const email = userInfo.data.email || '';

      // Store tokens in database
      const tokenExpiry = tokens.expiry_date 
        ? new Date(tokens.expiry_date).toISOString() 
        : null;

      // Check if account already exists
      const existing = await dbGet(
        'SELECT id FROM google_accounts WHERE user_id = ? AND email = ?',
        [userId, email]
      );

      if (existing) {
        // Update existing account
        await dbRun(
          `UPDATE google_accounts 
           SET access_token = ?, refresh_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND email = ?`,
          [
            tokens.access_token,
            tokens.refresh_token || null,
            tokenExpiry,
            userId,
            email
          ]
        );
      } else {
        // Create new account
        await dbRun(
          `INSERT INTO google_accounts (user_id, email, access_token, refresh_token, token_expiry)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            email,
            tokens.access_token,
            tokens.refresh_token || null,
            tokenExpiry
          ]
        );
      }

      return { userId, email };
    } catch (error: any) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error(`Failed to exchange authorization code: ${error.message}`);
    }
  }

  /**
   * Get valid access token for a Google account (refresh if needed)
   */
  static async getValidAccessToken(accountId: number): Promise<string> {
    const account: any = await dbGet(
      'SELECT * FROM google_accounts WHERE id = ? AND is_active = 1',
      [accountId]
    );

    if (!account) {
      throw new Error('Google account not found or inactive');
    }

    // Check if token is expired
    const now = new Date();
    const expiry = account.token_expiry ? new Date(account.token_expiry) : null;

    if (expiry && expiry <= now && account.refresh_token) {
      // Refresh the token
      const client = getOrCreateOAuth2Client();
      client.setCredentials({
        refresh_token: account.refresh_token
      });

      try {
        const { credentials } = await client.refreshAccessToken();
        
        if (credentials.access_token) {
          const tokenExpiry = credentials.expiry_date 
            ? new Date(credentials.expiry_date).toISOString() 
            : null;

          await dbRun(
            `UPDATE google_accounts 
             SET access_token = ?, refresh_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              credentials.access_token,
              credentials.refresh_token || account.refresh_token,
              tokenExpiry,
              accountId
            ]
          );

          return credentials.access_token;
        }
      } catch (error: any) {
        console.error('Error refreshing token:', error);
        throw new Error('Failed to refresh access token. Please reconnect your Google account.');
      }
    }

    return account.access_token;
  }

  /**
   * Get OAuth2 client configured for a specific account
   */
  static async getOAuth2Client(accountId: number) {
    const client = getOrCreateOAuth2Client();
    const accessToken = await this.getValidAccessToken(accountId);
    client.setCredentials({ access_token: accessToken });
    return client;
  }

  /**
   * Disconnect a Google account
   */
  static async disconnectAccount(accountId: number, userId: number): Promise<void> {
    const account: any = await dbGet(
      'SELECT * FROM google_accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    );

    if (!account) {
      throw new Error('Google account not found');
    }

    await dbRun(
      'UPDATE google_accounts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [accountId]
    );
  }

  /**
   * Get all active Google accounts for a user
   */
  static async getUserAccounts(userId: number): Promise<any[]> {
    return await dbAll(
      'SELECT id, email, calendar_id, calendar_name, created_at, updated_at FROM google_accounts WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
      [userId]
    );
  }
}

