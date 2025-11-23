import React, { useState, useEffect } from 'react';
import AdminNav from '../../components/AdminNav';
import { adminAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';
import '../Dashboard.css';

interface GoogleAccount {
  id: number;
  email: string;
  calendar_id: string | null;
  calendar_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
}

interface CalendarPolicy {
  id: number;
  name: string;
  description?: string;
  google_account_id: number;
  account_email: string;
  target_calendar_id: string;
  target_calendar_name: string;
  position_template_id?: number;
  template_title?: string;
  location_id?: number;
  location_name?: string;
  target_email_group?: string;
  is_active: number;
  created_at: string;
}

const GoogleIntegration: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'accounts' | 'policies'>('accounts');
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [policies, setPolicies] = useState<CalendarPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CalendarPolicy | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [locationTags, setLocationTags] = useState<any[]>([]);
  const { showToast } = useToast();

  const [policyFormData, setPolicyFormData] = useState({
    name: '',
    description: '',
    google_account_id: '',
    target_calendar_id: '',
    target_calendar_name: '',
    position_template_id: '',
    location_id: '',
    target_email_group: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'policies') {
      loadTemplates();
      loadLocationTags();
    }
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, policiesRes] = await Promise.all([
        adminAPI.getGoogleAccounts(),
        adminAPI.getCalendarPolicies()
      ]);
      setAccounts(accountsRes.data);
      setPolicies(policiesRes.data);
    } catch (error: any) {
      showToast('Failed to load data: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await adminAPI.getTemplates();
      setTemplates(res.data);
    } catch (error: any) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadLocationTags = async () => {
    try {
      const res = await adminAPI.getLocationTags();
      setLocationTags(res.data);
    } catch (error: any) {
      console.error('Failed to load location tags:', error);
    }
  };

  const handleConnectGoogle = async () => {
    if (!token || !user) {
      showToast('You must be logged in to connect a Google account', 'error');
      return;
    }

    try {
      setConnecting(true);
      const res = await adminAPI.getGoogleAuthUrl();
      window.location.href = res.data.authUrl;
    } catch (error: any) {
      showToast('Failed to initiate Google connection: ' + (error.response?.data?.error || error.message), 'error');
      setConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: number) => {
    if (!window.confirm('Are you sure you want to disconnect this Google account?')) {
      return;
    }

    try {
      await adminAPI.disconnectGoogleAccount(accountId);
      showToast('Google account disconnected successfully', 'success');
      loadData();
    } catch (error: any) {
      showToast('Failed to disconnect account: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleLoadCalendars = async (accountId: number) => {
    try {
      setLoadingCalendars(true);
      setSelectedAccount(accountId);
      const res = await adminAPI.getGoogleCalendars(accountId);
      setCalendars(res.data);
    } catch (error: any) {
      showToast('Failed to load calendars: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setLoadingCalendars(false);
    }
  };

  const handleSetPrimaryCalendar = async (accountId: number, calendarId: string, calendarName: string) => {
    try {
      await adminAPI.setPrimaryCalendar(accountId, {
        calendar_id: calendarId,
        calendar_name: calendarName
      });
      showToast('Primary calendar set successfully', 'success');
      loadData();
      setSelectedAccount(null);
    } catch (error: any) {
      showToast('Failed to set primary calendar: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleSyncEvents = async (accountId: number) => {
    try {
      const res = await adminAPI.syncCalendarEvents(accountId, 30);
      showToast(`Found ${res.data.count} relevant events from calendar`, 'success');
    } catch (error: any) {
      showToast('Failed to sync events: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleCreatePolicy = async () => {
    try {
      const data = {
        ...policyFormData,
        google_account_id: parseInt(policyFormData.google_account_id),
        position_template_id: policyFormData.position_template_id ? parseInt(policyFormData.position_template_id) : null,
        location_id: policyFormData.location_id ? parseInt(policyFormData.location_id) : null,
        target_email_group: policyFormData.target_email_group || null
      };

      if (editingPolicy) {
        await adminAPI.updateCalendarPolicy(editingPolicy.id, data);
        showToast('Policy updated successfully', 'success');
      } else {
        await adminAPI.createCalendarPolicy(data);
        showToast('Policy created successfully', 'success');
      }

      setShowPolicyForm(false);
      setEditingPolicy(null);
      setPolicyFormData({
        name: '',
        description: '',
        google_account_id: '',
        target_calendar_id: '',
        target_calendar_name: '',
        position_template_id: '',
        location_id: '',
        target_email_group: '',
        is_active: true
      });
      loadData();
    } catch (error: any) {
      showToast('Failed to save policy: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleEditPolicy = (policy: CalendarPolicy) => {
    setEditingPolicy(policy);
    setPolicyFormData({
      name: policy.name,
      description: policy.description || '',
      google_account_id: policy.google_account_id.toString(),
      target_calendar_id: policy.target_calendar_id,
      target_calendar_name: policy.target_calendar_name,
      position_template_id: policy.position_template_id?.toString() || '',
      location_id: policy.location_id?.toString() || '',
      target_email_group: policy.target_email_group || '',
      is_active: policy.is_active === 1
    });
    setShowPolicyForm(true);
  };

  const handleDeletePolicy = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this policy?')) {
      return;
    }

    try {
      await adminAPI.deleteCalendarPolicy(id);
      showToast('Policy deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      showToast('Failed to delete policy: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  // Check for OAuth callback parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    const email = params.get('email');

    if (success === 'true' && email) {
      showToast(`Successfully connected Google account: ${email}`, 'success');
      loadData();
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      showToast(`Google connection failed: ${decodeURIComponent(error)}`, 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <>
      <AdminNav />
      <div className="dashboard-content">
        <h2>Google Calendar Integration</h2>

        <div className="tabs" style={{ marginBottom: '2rem' }}>
          <button
            className={activeTab === 'accounts' ? 'tab-active' : 'tab'}
            onClick={() => setActiveTab('accounts')}
          >
            Google Accounts
          </button>
          <button
            className={activeTab === 'policies' ? 'tab-active' : 'tab'}
            onClick={() => setActiveTab('policies')}
          >
            Forwarding Policies
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {activeTab === 'accounts' && (
              <div>
                <div style={{ marginBottom: '2rem' }}>
                  <button
                    className="btn-primary"
                    onClick={handleConnectGoogle}
                    disabled={connecting}
                  >
                    {connecting ? 'Connecting...' : '+ Connect Google Account'}
                  </button>
                </div>

                {accounts.length === 0 ? (
                  <div className="card">
                    <p>No Google accounts connected. Click the button above to connect your first account.</p>
                  </div>
                ) : (
                  <div className="card-list">
                    {accounts.map((account) => (
                      <div key={account.id} className="card" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div>
                            <h3>{account.email}</h3>
                            {account.calendar_name && (
                              <p style={{ color: '#666', marginTop: '0.5rem' }}>
                                Primary Calendar: {account.calendar_name}
                              </p>
                            )}
                            <p style={{ color: '#999', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                              Connected: {new Date(account.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <button
                              className="btn-secondary"
                              onClick={() => handleLoadCalendars(account.id)}
                              style={{ marginRight: '0.5rem' }}
                            >
                              Manage Calendars
                            </button>
                            <button
                              className="btn-secondary"
                              onClick={() => handleSyncEvents(account.id)}
                              style={{ marginRight: '0.5rem' }}
                            >
                              Sync Events
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() => handleDisconnect(account.id)}
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>

                        {selectedAccount === account.id && (
                          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
                            {loadingCalendars ? (
                              <p>Loading calendars...</p>
                            ) : calendars.length === 0 ? (
                              <p>No calendars found</p>
                            ) : (
                              <div>
                                <h4>Select Primary Calendar:</h4>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                  {calendars.map((cal) => (
                                    <div
                                      key={cal.id}
                                      style={{
                                        padding: '0.75rem',
                                        margin: '0.5rem 0',
                                        background: 'white',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                      }}
                                    >
                                      <div>
                                        <strong>{cal.summary}</strong>
                                        {cal.primary && <span style={{ marginLeft: '0.5rem', color: '#666' }}>(Primary)</span>}
                                        {cal.description && (
                                          <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                                            {cal.description}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        className="btn-primary"
                                        onClick={() => handleSetPrimaryCalendar(account.id, cal.id, cal.summary)}
                                        disabled={account.calendar_id === cal.id}
                                      >
                                        {account.calendar_id === cal.id ? 'Current' : 'Set as Primary'}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'policies' && (
              <div>
                <div style={{ marginBottom: '2rem' }}>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setShowPolicyForm(true);
                      setEditingPolicy(null);
                      setPolicyFormData({
                        name: '',
                        description: '',
                        google_account_id: '',
                        target_calendar_id: '',
                        target_calendar_name: '',
                        position_template_id: '',
                        location_id: '',
                        target_email_group: '',
                        is_active: true
                      });
                    }}
                  >
                    + Create Forwarding Policy
                  </button>
                </div>

                {showPolicyForm && (
                  <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3>{editingPolicy ? 'Edit Policy' : 'Create Forwarding Policy'}</h3>
                    <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                      <div>
                        <label>Policy Name *</label>
                        <input
                          type="text"
                          value={policyFormData.name}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, name: e.target.value })}
                          placeholder="e.g., Weekly Volunteer Shifts"
                        />
                      </div>
                      <div>
                        <label>Description</label>
                        <textarea
                          value={policyFormData.description}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, description: e.target.value })}
                          placeholder="Optional description"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label>Google Account *</label>
                        <select
                          value={policyFormData.google_account_id}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, google_account_id: e.target.value })}
                        >
                          <option value="">Select account...</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      {policyFormData.google_account_id && (
                        <>
                          <div>
                            <label>Target Calendar ID *</label>
                            <input
                              type="text"
                              value={policyFormData.target_calendar_id}
                              onChange={(e) => setPolicyFormData({ ...policyFormData, target_calendar_id: e.target.value })}
                              placeholder="calendar@example.com"
                            />
                            <small style={{ color: '#666', display: 'block', marginTop: '0.25rem' }}>
                              Use the calendar ID (email address) where events should be forwarded
                            </small>
                          </div>
                          <div>
                            <label>Target Calendar Name *</label>
                            <input
                              type="text"
                              value={policyFormData.target_calendar_name}
                              onChange={(e) => setPolicyFormData({ ...policyFormData, target_calendar_name: e.target.value })}
                              placeholder="Volunteer Calendar"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label>Filter by Template (Optional)</label>
                        <select
                          value={policyFormData.position_template_id}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, position_template_id: e.target.value })}
                        >
                          <option value="">All templates</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label>Filter by Location (Optional)</label>
                        <select
                          value={policyFormData.location_id}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, location_id: e.target.value })}
                        >
                          <option value="">All locations</option>
                          {locationTags.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label>Email Group (Optional)</label>
                        <input
                          type="text"
                          value={policyFormData.target_email_group}
                          onChange={(e) => setPolicyFormData({ ...policyFormData, target_email_group: e.target.value })}
                          placeholder="email1@example.com, email2@example.com"
                        />
                        <small style={{ color: '#666', display: 'block', marginTop: '0.25rem' }}>
                          Comma-separated list of emails to invite to calendar events
                        </small>
                      </div>
                      <div>
                        <label>
                          <input
                            type="checkbox"
                            checked={policyFormData.is_active}
                            onChange={(e) => setPolicyFormData({ ...policyFormData, is_active: e.target.checked })}
                          />
                          {' '}Active
                        </label>
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-primary" onClick={handleCreatePolicy}>
                        {editingPolicy ? 'Update Policy' : 'Create Policy'}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setShowPolicyForm(false);
                          setEditingPolicy(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {policies.length === 0 ? (
                  <div className="card">
                    <p>No forwarding policies configured. Create one to automatically forward scheduler output to Google Calendars.</p>
                  </div>
                ) : (
                  <div className="card-list">
                    {policies.map((policy) => (
                      <div key={policy.id} className="card" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div>
                            <h3>
                              {policy.name}
                              {policy.is_active === 0 && (
                                <span style={{ marginLeft: '0.5rem', color: '#999', fontSize: '0.9rem' }}>(Inactive)</span>
                              )}
                            </h3>
                            {policy.description && (
                              <p style={{ color: '#666', marginTop: '0.5rem' }}>{policy.description}</p>
                            )}
                            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                              <p><strong>Account:</strong> {policy.account_email}</p>
                              <p><strong>Target Calendar:</strong> {policy.target_calendar_name} ({policy.target_calendar_id})</p>
                              {policy.template_title && (
                                <p><strong>Template Filter:</strong> {policy.template_title}</p>
                              )}
                              {policy.location_name && (
                                <p><strong>Location Filter:</strong> {policy.location_name}</p>
                              )}
                              {policy.target_email_group && (
                                <p><strong>Email Group:</strong> {policy.target_email_group}</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <button
                              className="btn-secondary"
                              onClick={() => handleEditPolicy(policy)}
                              style={{ marginRight: '0.5rem' }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() => handleDeletePolicy(policy.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default GoogleIntegration;

