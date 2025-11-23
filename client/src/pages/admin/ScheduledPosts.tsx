import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import AdminNav from '../../components/AdminNav';
import '../Dashboard.css';

const ScheduledPosts: React.FC = () => {
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    template_id: '',
    cron_expression: '',
    days_ahead: '7',
  });
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadScheduled();
    loadTemplates();
  }, []);

  const loadScheduled = async () => {
    try {
      const response = await adminAPI.getScheduledPosts();
      setScheduled(response.data);
    } catch (error) {
      console.error('Failed to load scheduled posts:', error);
      showToast('Failed to load scheduled posts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await adminAPI.getTemplates();
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      showToast('Failed to load templates', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminAPI.createScheduledPost(formData);
      setShowForm(false);
      setFormData({ template_id: '', cron_expression: '', days_ahead: '7' });
      loadScheduled();
      showToast('Scheduled post created successfully!', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to create scheduled post', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: number) => {
    setToggling(id);
    try {
      await adminAPI.toggleScheduledPost(id);
      showToast('Scheduled post status updated', 'success');
      loadScheduled();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to toggle scheduled post', 'error');
    } finally {
      setToggling(null);
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
          <h2>Scheduled Posts</h2>
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
            Create Scheduled Post
          </button>
        </div>

        {showForm && (
          <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div className="modal-content">
              <h3>Create Scheduled Post</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Template</label>
                  <select
                    value={formData.template_id}
                    onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                    required
                    disabled={submitting}
                  >
                    <option value="">Select a template</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Cron Expression (e.g., "0 9 * * 1" for every Monday at 9 AM)</label>
                  <input
                    type="text"
                    value={formData.cron_expression}
                    onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                    placeholder="0 9 * * 1"
                    required
                    disabled={submitting}
                  />
                  <small>Format: minute hour day month weekday</small>
                </div>
                <div className="form-group">
                  <label>Days Ahead</label>
                  <input
                    type="number"
                    value={formData.days_ahead}
                    onChange={(e) => setFormData({ ...formData, days_ahead: e.target.value })}
                    min="1"
                    required
                    disabled={submitting}
                  />
                  <small>How many days in advance to post the position</small>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1 }}>
                    {submitting ? 'Creating...' : 'Create'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" disabled={submitting} style={{ flex: 1 }}>
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
            <p>Loading scheduled posts...</p>
          </div>
        ) : scheduled.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⏰</div>
            <h3>No scheduled posts yet</h3>
            <p>Create a scheduled post to automatically post positions on a recurring schedule!</p>
          </div>
        ) : (
          <div className="scheduled-grid">
            {scheduled.map((item) => (
              <div key={item.id} className="scheduled-card">
                <h3>{item.template_title}</h3>
                <p><strong>Cron Expression:</strong> <code style={{ background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{item.cron_expression}</code></p>
                <p><strong>Days Ahead:</strong> {item.days_ahead}</p>
                <p><strong>Status:</strong> {item.is_active ? <span className="badge success">Active</span> : <span className="badge cancelled">Inactive</span>}</p>
                <button
                  onClick={() => handleToggle(item.id)}
                  className={item.is_active ? 'btn-danger' : 'btn-primary'}
                  disabled={toggling === item.id}
                  style={{ marginTop: '0.5rem' }}
                >
                  {toggling === item.id ? 'Updating...' : item.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ScheduledPosts;

