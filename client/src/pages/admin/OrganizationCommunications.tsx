import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import AdminNav from '../../components/AdminNav';
import '../Dashboard.css';

const OrganizationCommunications: React.FC = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [salesforceStatus, setSalesforceStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSalesforceModal, setShowSalesforceModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [salesforceApiKey, setSalesforceApiKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    type: 'both' as 'email' | 'sms' | 'both',
    cron_expression: '',
  });

  const [scheduleOptions, setScheduleOptions] = useState({
    frequency: 'immediate' as 'immediate' | 'daily' | 'weekly' | 'monthly',
    time: '09:00',
    daysOfWeek: [] as number[],
    dayOfMonth: '1',
  });

  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadAnnouncements(), loadSalesforceStatus()]);
    setLoading(false);
  };

  const loadAnnouncements = async () => {
    try {
      const response = await adminAPI.getAnnouncements();
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      showToast('Failed to load announcements', 'error');
    }
  };

  const loadSalesforceStatus = async () => {
    try {
      const response = await adminAPI.getSalesforceStatus();
      setSalesforceStatus(response.data);
    } catch (error) {
      console.error('Failed to load Salesforce status:', error);
    }
  };

  // Generate cron expression from schedule options
  const generateCronExpression = (): string | null => {
    if (scheduleOptions.frequency === 'immediate') return null;

    const [hours, minutes] = scheduleOptions.time.split(':');
    const minute = minutes || '0';
    const hour = hours || '9';

    switch (scheduleOptions.frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        if (scheduleOptions.daysOfWeek.length === 0) return null;
        const firstDay = scheduleOptions.daysOfWeek[0];
        return `${minute} ${hour} * * ${firstDay}`;
      case 'monthly':
        const day = scheduleOptions.dayOfMonth || '1';
        return `${minute} ${hour} ${day} * *`;
      default:
        return null;
    }
  };

  // Parse cron expression to human-readable format
  const parseCronExpression = (cronExpr: string | null): string => {
    if (!cronExpr) return 'Immediate';
    
    const parts = cronExpr.split(' ');
    if (parts.length !== 5) return cronExpr;

    const [minute, hour, day, month, weekday] = parts;
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);
    const time12h = new Date(2000, 0, 1, hourNum, minuteNum).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    if (day === '*' && month === '*' && weekday === '*') {
      return `Daily at ${time12h}`;
    } else if (day === '*' && month === '*' && weekday !== '*') {
      const weekdayNum = parseInt(weekday);
      const dayIndex = weekdayNum === 7 ? 0 : weekdayNum % 7;
      const dayName = dayNames[dayIndex];
      return `Every ${dayName} at ${time12h}`;
    } else if (day !== '*' && month === '*' && weekday === '*') {
      const dayNum = parseInt(day);
      const suffix = dayNum === 1 ? 'st' : dayNum === 2 ? 'nd' : dayNum === 3 ? 'rd' : 'th';
      return `Monthly on the ${dayNum}${suffix} at ${time12h}`;
    }
    
    return cronExpr;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (scheduleOptions.frequency === 'weekly' && scheduleOptions.daysOfWeek.length === 0) {
      showToast('Please select at least one day for weekly schedules', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const cronExpression = generateCronExpression();
      await adminAPI.createAnnouncement({
        ...formData,
        cron_expression: cronExpression,
      });
      setShowForm(false);
      setFormData({ title: '', description: '', link: '', type: 'both', cron_expression: '' });
      setScheduleOptions({
        frequency: 'immediate',
        time: '09:00',
        daysOfWeek: [],
        dayOfMonth: '1',
      });
      loadAnnouncements();
      showToast('Announcement created successfully!', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to create announcement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async (id: number) => {
    setSending(id);
    try {
      await adminAPI.sendAnnouncement(id);
      showToast('Announcement sent successfully!', 'success');
      loadAnnouncements();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to send announcement', 'error');
    } finally {
      setSending(null);
    }
  };

  const handleToggle = async (id: number) => {
    setToggling(id);
    try {
      await adminAPI.toggleAnnouncement(id);
      showToast('Announcement status updated', 'success');
      loadAnnouncements();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to toggle announcement', 'error');
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    setDeleting(id);
    try {
      await adminAPI.deleteAnnouncement(id);
      showToast('Announcement deleted successfully', 'success');
      loadAnnouncements();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to delete announcement', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleConnectSalesforce = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    try {
      const response = await adminAPI.connectSalesforce(salesforceApiKey);
      showToast('Connected to Salesforce (Mock Mode)', 'success');
      setShowSalesforceModal(false);
      setSalesforceApiKey('');
      loadSalesforceStatus();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to connect to Salesforce', 'error');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
      <AdminNav />
      <div className="dashboard-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Organization Communications</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Send updates and announcements to volunteers via email and SMS
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setShowSalesforceModal(true)} 
              className="btn-secondary" 
              style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
            >
              {salesforceStatus?.connected ? '✓ Salesforce Connected' : 'Connect Salesforce'}
            </button>
            <button 
              onClick={() => {
                setShowForm(true);
                setFormData({ title: '', description: '', link: '', type: 'both', cron_expression: '' });
                setScheduleOptions({
                  frequency: 'immediate',
                  time: '09:00',
                  daysOfWeek: [],
                  dayOfMonth: '1',
                });
              }} 
              className="btn-primary" 
              style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
            >
              Create Announcement
            </button>
          </div>
        </div>

        {salesforceStatus && (
          <div style={{ 
            padding: '1rem', 
            background: salesforceStatus.connected ? 'var(--success-color)' : 'var(--bg-secondary)', 
            borderRadius: '8px',
            marginBottom: '2rem',
            color: salesforceStatus.connected ? 'white' : 'var(--text-color)'
          }}>
            <strong>Salesforce Status:</strong> {salesforceStatus.connected ? 'Connected (Mock Mode)' : 'Not Connected'}
            {salesforceStatus.connected && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                Contacts: {salesforceStatus.contactCount} | Campaigns: {salesforceStatus.campaignCount}
                <br />
                <small style={{ opacity: 0.9 }}>Note: This is a mock implementation for MVP demonstration</small>
              </div>
            )}
          </div>
        )}

        {showSalesforceModal && (
          <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setShowSalesforceModal(false); }}>
            <div className="modal-content">
              <h3>Connect to Salesforce</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Enter your Salesforce API key to enable integration. For MVP demonstration, any non-empty key will work.
              </p>
              <form onSubmit={handleConnectSalesforce}>
                <div className="form-group">
                  <label>API Key</label>
                  <input
                    type="text"
                    value={salesforceApiKey}
                    onChange={(e) => setSalesforceApiKey(e.target.value)}
                    placeholder="Enter Salesforce API key"
                    required
                    disabled={connecting}
                  />
                  <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
                    Mock Mode: Any non-empty value will work for demonstration purposes
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn-primary" disabled={connecting} style={{ flex: 1 }}>
                    {connecting ? 'Connecting...' : 'Connect'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowSalesforceModal(false)} 
                    className="btn-secondary" 
                    disabled={connecting} 
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showForm && (
          <div className="modal" onClick={(e) => { 
              if (e.target === e.currentTarget) {
              setShowForm(false);
              setFormData({ title: '', description: '', link: '', type: 'both', cron_expression: '' });
              setScheduleOptions({
                frequency: 'immediate',
                time: '09:00',
                daysOfWeek: [],
                dayOfMonth: '1',
              });
            }
          }}>
            <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3>Create Organization Announcement</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    disabled={submitting}
                    placeholder="e.g., Park Cleanup Day Reminder"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={6}
                    disabled={submitting}
                    placeholder="Enter your announcement description here..."
                  />
                </div>
                <div className="form-group">
                  <label>Document Link (optional)</label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    disabled={submitting}
                    placeholder="https://docs.google.com/document/..."
                  />
                  <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
                    Link to a Google Doc, Sheet, or other document for participants to view
                  </small>
                </div>
                <div className="form-group">
                  <label>Communication Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'email' | 'sms' | 'both' })}
                    disabled={submitting}
                    style={{ marginBottom: '1rem' }}
                  >
                    <option value="email">Email Only</option>
                    <option value="sms">SMS Only</option>
                    <option value="both">Email & SMS</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Schedule</label>
                  <select
                    value={scheduleOptions.frequency}
                    onChange={(e) => setScheduleOptions({ 
                      ...scheduleOptions, 
                      frequency: e.target.value as 'immediate' | 'daily' | 'weekly' | 'monthly',
                      daysOfWeek: e.target.value === 'weekly' ? scheduleOptions.daysOfWeek : []
                    })}
                    disabled={submitting}
                    style={{ marginBottom: '1rem' }}
                  >
                    <option value="immediate">Send Immediately</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {scheduleOptions.frequency !== 'immediate' && (
                  <>
                    {scheduleOptions.frequency === 'weekly' && (
                      <div className="form-group">
                        <label>Days of Week</label>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(7, 1fr)', 
                          gap: '0.5rem',
                          marginBottom: '1rem'
                        }}>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                            const isSelected = scheduleOptions.daysOfWeek.includes(index);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setScheduleOptions({
                                      ...scheduleOptions,
                                      daysOfWeek: scheduleOptions.daysOfWeek.filter(d => d !== index)
                                    });
                                  } else {
                                    setScheduleOptions({
                                      ...scheduleOptions,
                                      daysOfWeek: [...scheduleOptions.daysOfWeek, index].sort()
                                    });
                                  }
                                }}
                                disabled={submitting}
                                style={{
                                  padding: '0.75rem',
                                  borderRadius: '6px',
                                  border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                  background: isSelected ? 'var(--primary-color)' : 'transparent',
                                  color: isSelected ? 'white' : 'var(--text-color)',
                                  cursor: submitting ? 'not-allowed' : 'pointer',
                                  fontWeight: isSelected ? '600' : '400',
                                  fontSize: '0.9rem'
                                }}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {scheduleOptions.frequency === 'monthly' && (
                      <div className="form-group">
                        <label>Day of Month</label>
                        <select
                          value={scheduleOptions.dayOfMonth}
                          onChange={(e) => setScheduleOptions({ ...scheduleOptions, dayOfMonth: e.target.value })}
                          disabled={submitting}
                          style={{ marginBottom: '1rem' }}
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <option key={day} value={day}>
                              {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Time</label>
                      <input
                        type="time"
                        value={scheduleOptions.time}
                        onChange={(e) => setScheduleOptions({ ...scheduleOptions, time: e.target.value })}
                        required
                        disabled={submitting}
                        style={{ marginBottom: '1rem' }}
                      />
                    </div>

                    <div style={{ 
                      padding: '0.75rem', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: '6px',
                      marginBottom: '1rem'
                    }}>
                      <strong>Schedule Preview:</strong> {parseCronExpression(generateCronExpression())}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1 }}>
                    {submitting ? 'Creating...' : 'Create Announcement'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ title: '', description: '', link: '', type: 'both', cron_expression: '' });
                      setScheduleOptions({
                        frequency: 'immediate',
                        time: '09:00',
                        daysOfWeek: [],
                        dayOfMonth: '1',
                      });
                    }} 
                    className="btn-secondary" 
                    disabled={submitting} 
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading announcements...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📢</div>
            <h3>No announcements yet</h3>
            <p>Create your first organization announcement to communicate with volunteers!</p>
          </div>
        ) : (
          <div className="templates-grid">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="template-card">
                <h3>{announcement.title}</h3>
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.9rem'
                }}>
                  {announcement.description || announcement.message}
                </div>
                {announcement.link && (
                  <div style={{ marginBottom: '1rem' }}>
                    <a 
                      href={announcement.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--primary-color)',
                        textDecoration: 'none',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      📄 View Document →
                    </a>
                  </div>
                )}
                <p><strong>Type:</strong> {announcement.type === 'both' ? 'Email & SMS' : announcement.type.toUpperCase()}</p>
                <p><strong>Schedule:</strong> {parseCronExpression(announcement.cron_expression)}</p>
                {announcement.last_sent_at && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Last sent: {new Date(announcement.last_sent_at).toLocaleString()}
                  </p>
                )}
                <p><strong>Status:</strong> {announcement.is_active ? <span className="badge success">Active</span> : <span className="badge cancelled">Inactive</span>}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  {announcement.cron_expression && (
                    <button
                      onClick={() => handleSend(announcement.id)}
                      className="btn-secondary"
                      disabled={sending === announcement.id || toggling === announcement.id || deleting === announcement.id}
                      style={{ flex: 1, minWidth: '120px' }}
                    >
                      {sending === announcement.id ? 'Sending...' : 'Send Now'}
                    </button>
                  )}
                  <button
                    onClick={() => handleToggle(announcement.id)}
                    className={announcement.is_active ? 'btn-secondary' : 'btn-primary'}
                    disabled={sending === announcement.id || toggling === announcement.id || deleting === announcement.id}
                    style={{ flex: 1, minWidth: '120px' }}
                  >
                    {toggling === announcement.id ? 'Updating...' : announcement.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="btn-danger"
                    disabled={sending === announcement.id || toggling === announcement.id || deleting === announcement.id}
                    style={{ flex: 1, minWidth: '120px' }}
                  >
                    {deleting === announcement.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default OrganizationCommunications;

