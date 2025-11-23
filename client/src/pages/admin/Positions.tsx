import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import AdminNav from '../../components/AdminNav';
import LocationTagsManager from '../../components/LocationTagsManager';
import '../Dashboard.css';

const Positions: React.FC = () => {
  const [positions, setPositions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [locationTags, setLocationTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showLocationTags, setShowLocationTags] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notifying, setNotifying] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    template_id: '',
    date: '',
    start_time: '',
    end_time: '',
    max_volunteers: '',
  });
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadPositions();
    loadTemplates();
    loadLocationTags();
  }, []);

  const loadPositions = async () => {
    try {
      const response = await adminAPI.getPositions();
      setPositions(response.data);
    } catch (error) {
      console.error('Failed to load positions:', error);
      showToast('Failed to load positions', 'error');
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

  const loadLocationTags = async () => {
    try {
      const response = await adminAPI.getLocationTags();
      setLocationTags(response.data);
    } catch (error) {
      console.error('Failed to load location tags:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Convert form data to proper types
      const positionData = {
        template_id: parseInt(formData.template_id, 10),
        date: formData.date, // Date input already provides ISO8601 format
        start_time: formData.start_time, // Time input provides HH:MM format
        end_time: formData.end_time || undefined,
        max_volunteers: formData.max_volunteers ? parseInt(formData.max_volunteers, 10) : undefined
      };
      await adminAPI.createPosition(positionData);
      setShowForm(false);
      setFormData({ template_id: '', date: '', start_time: '', end_time: '', max_volunteers: '' });
      loadPositions();
      showToast('Position created and volunteers notified!', 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Failed to create position';
      showToast(errorMessage, 'error');
      console.error('Position creation error:', error.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotify = async (id: number) => {
    setNotifying(id);
    try {
      await adminAPI.notifyVolunteers(id);
      showToast('Volunteers notified successfully!', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to notify volunteers', 'error');
    } finally {
      setNotifying(null);
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
          <h2>Posted Positions</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => setShowLocationTags(true)} className="btn-secondary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
              Manage Locations
            </button>
            <button onClick={() => setShowForm(true)} className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
              Post New Position
            </button>
          </div>
        </div>

        {showForm && (
          <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div className="modal-content">
              <h3>Post Position from Template</h3>
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
                  <label>Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>End Time (optional)</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>Max Volunteers (optional)</label>
                  <input
                    type="number"
                    value={formData.max_volunteers}
                    onChange={(e) => setFormData({ ...formData, max_volunteers: e.target.value })}
                    min="1"
                    disabled={submitting}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1 }}>
                    {submitting ? 'Posting...' : 'Post & Notify'}
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
            <p>Loading positions...</p>
          </div>
        ) : positions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No positions posted yet</h3>
            <p>Create a position from a template to get started!</p>
          </div>
        ) : (
          <div className="positions-grid">
            {positions.map((position) => (
              <div key={position.id} className="position-card">
                <h3>{position.title}</h3>
                <p className="position-date">
                  {new Date(position.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} at {position.start_time}
                </p>
                {(position.location_name || position.location) && <p className="position-location">{position.location_name || position.location}</p>}
                <p className="position-description">{position.description}</p>
                <p className="position-volunteers">
                  {position.volunteer_count || 0} {position.max_volunteers ? `/ ${position.max_volunteers}` : ''} volunteers
                </p>
                <p className="position-status">Status: <span className={`badge ${position.status === 'open' ? 'open' : 'pending'}`}>{position.status}</span></p>
                <button
                  onClick={() => handleNotify(position.id)}
                  className="btn-secondary"
                  disabled={notifying === position.id}
                  style={{ marginTop: '0.5rem' }}
                >
                  {notifying === position.id ? 'Notifying...' : 'Notify Volunteers'}
                </button>
              </div>
            ))}
          </div>
        )}

        {showLocationTags && (
          <LocationTagsManager
            onClose={() => { setShowLocationTags(false); loadLocationTags(); }}
            locationTags={locationTags}
            onTagsUpdate={loadLocationTags}
          />
        )}
      </div>
    </>
  );
};

export default Positions;

