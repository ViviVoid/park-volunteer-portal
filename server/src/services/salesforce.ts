/**
 * Mock Salesforce Integration Service
 * 
 * This is a mock implementation that simulates Salesforce API calls.
 * In production, this would connect to the actual Salesforce API using
 * the provided API key and credentials.
 * 
 * The mock demonstrates:
 * - Contact/Lead management
 * - Email campaign creation
 * - SMS campaign creation
 * - Scheduled communications
 * - Analytics and tracking
 */

interface SalesforceContact {
  id: string;
  email: string;
  phone?: string;
  name: string;
  firstName: string;
  lastName: string;
  preferences?: {
    email: boolean;
    sms: boolean;
  };
}

interface SalesforceCampaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'both';
  subject?: string;
  message: string;
  scheduledAt?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  sentCount: number;
  deliveredCount: number;
  openedCount?: number;
  clickedCount?: number;
}

class MockSalesforceService {
  private contacts: Map<string, SalesforceContact> = new Map();
  private campaigns: Map<string, SalesforceCampaign> = new Map();
  private apiKey: string | null = null;
  private isConnected: boolean = false;

  /**
   * Initialize connection with Salesforce API
   * In production, this would authenticate with Salesforce using OAuth2
   */
  async connect(apiKey: string): Promise<boolean> {
    // Mock: Simulate API connection
    if (!apiKey || apiKey.trim() === '') {
      console.log('[MOCK Salesforce] Connection failed: Invalid API key');
      return false;
    }

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 500));

    this.apiKey = apiKey;
    this.isConnected = true;
    console.log('[MOCK Salesforce] Successfully connected to Salesforce API');
    return true;
  }

  /**
   * Check if Salesforce is connected
   */
  isApiConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Sync volunteers from local database to Salesforce
   * In production, this would create/update Contact records in Salesforce
   */
  async syncContacts(volunteers: Array<{
    id: number;
    email: string;
    phone?: string;
    name: string;
    notification_preference: string;
  }>): Promise<{ synced: number; errors: number }> {
    if (!this.isConnected) {
      console.log('[MOCK Salesforce] Not connected - skipping sync');
      return { synced: 0, errors: 0 };
    }

    let synced = 0;
    let errors = 0;

    for (const volunteer of volunteers) {
      try {
        const [firstName, ...lastNameParts] = volunteer.name.split(' ');
        const lastName = lastNameParts.join(' ') || firstName;

        const contact: SalesforceContact = {
          id: `SF_${volunteer.id}`,
          email: volunteer.email,
          phone: volunteer.phone || undefined,
          name: volunteer.name,
          firstName: firstName,
          lastName: lastName,
          preferences: {
            email: volunteer.notification_preference === 'email' || volunteer.notification_preference === 'both',
            sms: volunteer.notification_preference === 'phone' || volunteer.notification_preference === 'both',
          },
        };

        this.contacts.set(contact.id, contact);
        synced++;
      } catch (error) {
        console.error(`[MOCK Salesforce] Error syncing contact ${volunteer.email}:`, error);
        errors++;
      }
    }

    console.log(`[MOCK Salesforce] Synced ${synced} contacts, ${errors} errors`);
    return { synced, errors };
  }

  /**
   * Create an email campaign in Salesforce
   * In production, this would create a Marketing Cloud email campaign
   */
  async createEmailCampaign(data: {
    name: string;
    subject: string;
    message: string;
    scheduledAt?: string;
  }): Promise<SalesforceCampaign> {
    if (!this.isConnected) {
      throw new Error('Salesforce API not connected');
    }

    const campaign: SalesforceCampaign = {
      id: `CAMPAIGN_${Date.now()}`,
      name: data.name,
      type: 'email',
      subject: data.subject,
      message: data.message,
      scheduledAt: data.scheduledAt,
      status: data.scheduledAt ? 'scheduled' : 'draft',
      sentCount: 0,
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
    };

    this.campaigns.set(campaign.id, campaign);
    console.log(`[MOCK Salesforce] Created email campaign: ${campaign.name} (${campaign.id})`);
    return campaign;
  }

  /**
   * Create an SMS campaign in Salesforce
   * In production, this would create a Marketing Cloud SMS campaign
   */
  async createSMSCampaign(data: {
    name: string;
    message: string;
    scheduledAt?: string;
  }): Promise<SalesforceCampaign> {
    if (!this.isConnected) {
      throw new Error('Salesforce API not connected');
    }

    const campaign: SalesforceCampaign = {
      id: `SMS_${Date.now()}`,
      name: data.name,
      type: 'sms',
      message: data.message,
      scheduledAt: data.scheduledAt,
      status: data.scheduledAt ? 'scheduled' : 'draft',
      sentCount: 0,
      deliveredCount: 0,
    };

    this.campaigns.set(campaign.id, campaign);
    console.log(`[MOCK Salesforce] Created SMS campaign: ${campaign.name} (${campaign.id})`);
    return campaign;
  }

  /**
   * Send a campaign immediately
   * In production, this would trigger the campaign in Marketing Cloud
   */
  async sendCampaign(campaignId: string, contactIds?: string[]): Promise<{
    sent: number;
    delivered: number;
    failed: number;
  }> {
    if (!this.isConnected) {
      throw new Error('Salesforce API not connected');
    }

    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const contactsToSend = contactIds 
      ? contactIds.map(id => this.contacts.get(id)).filter(Boolean) as SalesforceContact[]
      : Array.from(this.contacts.values());

    let sent = 0;
    let delivered = 0;
    let failed = 0;

    for (const contact of contactsToSend) {
      // Check preferences
      if (campaign.type === 'email' && !contact.preferences?.email) continue;
      if (campaign.type === 'sms' && !contact.preferences?.sms) continue;
      if (campaign.type === 'both' && !contact.preferences?.email && !contact.preferences?.sms) continue;

      sent++;
      // Simulate delivery (90% success rate)
      if (Math.random() > 0.1) {
        delivered++;
      } else {
        failed++;
      }
    }

    campaign.status = 'sent';
    campaign.sentCount = sent;
    campaign.deliveredCount = delivered;

    console.log(`[MOCK Salesforce] Sent campaign ${campaignId}: ${sent} sent, ${delivered} delivered, ${failed} failed`);
    return { sent, delivered, failed };
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<SalesforceCampaign | null> {
    return this.campaigns.get(campaignId) || null;
  }

  /**
   * Get all campaigns
   */
  async getAllCampaigns(): Promise<SalesforceCampaign[]> {
    return Array.from(this.campaigns.values());
  }

  /**
   * Get contact count
   */
  async getContactCount(): Promise<number> {
    return this.contacts.size;
  }
}

// Export singleton instance
export const salesforceService = new MockSalesforceService();

// Export types
export type { SalesforceContact, SalesforceCampaign };

