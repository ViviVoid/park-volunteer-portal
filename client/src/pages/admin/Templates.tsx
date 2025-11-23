import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import AdminNav from '../../components/AdminNav';
import LocationTagsManager from '../../components/LocationTagsManager';
import RequirementTagsManager from '../../components/RequirementTagsManager';
import '../Dashboard.css';

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [locationTags, setLocationTags] = useState<any[]>([]);
  const [requirementTags, setRequirementTags] = useState<any[]>([]);
  const [requirementTagSearch, setRequirementTagSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showLocationTags, setShowLocationTags] = useState(false);
  const [showRequirementTags, setShowRequirementTags] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    duration_hours: '',
    location_id: '',
    requirement_tag_ids: [] as number[],
  });
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadTemplates();
    loadLocationTags();
    loadRequirementTags();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await adminAPI.getTemplates();
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      showToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
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

  const loadRequirementTags = async () => {
    try {
      const response = await adminAPI.getRequirementTags();
      setRequirementTags(response.data);
    } catch (error) {
      console.error('Failed to load requirement tags:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await adminAPI.updateTemplate(editing.id, formData);
        showToast('Template updated successfully!', 'success');
      } else {
        await adminAPI.createTemplate(formData);
        showToast('Template created successfully!', 'success');
      }
      setShowForm(false);
      setEditing(null);
      setRequirementTagSearch('');
      setFormData({ title: '', description: '', requirements: '', duration_hours: '', location_id: '', requirement_tag_ids: [] });
      loadTemplates();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to save template', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (template: any) => {
    setEditing(template);
    setRequirementTagSearch('');
    setFormData({
      title: template.title,
      description: template.description,
      requirements: template.requirements || '',
      duration_hours: template.duration_hours || '',
      location_id: template.location_tag_id || template.location_id || '',
      requirement_tag_ids: template.requirement_tags ? template.requirement_tags.map((tag: any) => tag.id) : [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await adminAPI.deleteTemplate(id);
      showToast('Template deleted successfully', 'success');
      loadTemplates();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to delete template', 'error');
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
          <h2>Position Templates</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowRequirementTags(true)} className="btn-secondary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
              Manage Requirement Tags
            </button>
            <button onClick={() => setShowLocationTags(true)} className="btn-secondary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
              Manage Locations
            </button>
            <button onClick={() => { setShowForm(true); setEditing(null); setRequirementTagSearch(''); setFormData({ title: '', description: '', requirements: '', duration_hours: '', location_id: '', requirement_tag_ids: [] }); }} className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
              Create Template
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h3>No templates yet</h3>
            <p>Create your first position template to get started!</p>
          </div>
        ) : (
          <div className="templates-grid">
            {templates.map((template) => (
              <div key={template.id} className="template-card">
                <h3>{template.title}</h3>
                <p>{template.description}</p>
                {template.requirements && <p><strong>Requirements:</strong> {template.requirements}</p>}
                {template.requirement_tags && template.requirement_tags.length > 0 && (
                  <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    <strong>Requirement Tags: </strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                      {template.requirement_tags.map((tag: any) => (
                        <span 
                          key={tag.id}
                          style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.85rem'
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {template.duration_hours && <p><strong>Duration:</strong> {template.duration_hours} hours</p>}
                {(template.location_name || template.location) && <p><strong>Location:</strong> {template.location_name || template.location}</p>}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button onClick={() => handleEdit(template)} className="btn-secondary" style={{ width: 'auto', flex: 1 }}>Edit</button>
                  <button onClick={() => handleDelete(template.id)} className="btn-danger" style={{ width: 'auto', flex: 1 }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditing(null); setRequirementTagSearch(''); } }}>
            <div className="modal-content">
              <h3>{editing ? 'Edit Template' : 'Create Template'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={4}
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label>Location (optional)</label>
                    <small style={{ marginTop: '0.5rem', display: 'block' }}>
                      <button 
                        type="button" 
                        onClick={(e) => { e.preventDefault(); setShowLocationTags(true); }}
                        className="btn-secondary"
                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      >
                        Manage Locations
                      </button>
                    </small>
                  </div>
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    disabled={submitting}
                  >
                    <option value="">No location</option>
                    {locationTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>{tag.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Requirements (optional)</label>
                  <textarea
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    rows={3}
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ marginBottom: 0 }}>Requirement Tags (optional)</label>
                    <button 
                      type="button" 
                      onClick={(e) => { e.preventDefault(); setShowRequirementTags(true); }}
                      className="btn-secondary"
                      style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                      Manage Tags
                    </button>
                  </div>
                  {requirementTags.length === 0 ? (
                    <div style={{ 
                      padding: '2rem', 
                      textAlign: 'center', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '4px',
                      background: 'var(--card-bg)'
                    }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
                        No requirement tags yet.
                      </p>
                      <button 
                        type="button" 
                        onClick={(e) => { e.preventDefault(); setShowRequirementTags(true); }}
                        className="btn-primary"
                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      >
                        Create Requirement Tags
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <input
                          type="text"
                          placeholder="Search requirement tags..."
                          value={requirementTagSearch}
                          onChange={(e) => setRequirementTagSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.9rem',
                            background: 'var(--card-bg)',
                            color: 'var(--text-color)'
                          }}
                        />
                      </div>
                      {(() => {
                        const searchLower = requirementTagSearch.toLowerCase().trim();
                        const filteredTags = requirementTagSearch
                          ? requirementTags.filter(tag => 
                              tag.name.toLowerCase().includes(searchLower) ||
                              (tag.description && tag.description.toLowerCase().includes(searchLower))
                            )
                          : requirementTags;
                        
                        if (filteredTags.length === 0) {
                          return (
                            <div style={{ 
                              padding: '2rem', 
                              textAlign: 'center', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: '4px',
                              background: 'var(--card-bg)'
                            }}>
                              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                                No requirement tags found matching "{requirementTagSearch}"
                              </p>
                            </div>
                          );
                        }
                        
                        return (
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: '0.75rem',
                            padding: '1rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            background: 'var(--card-bg)',
                            maxHeight: '300px',
                            overflowY: 'auto'
                          }}>
                            {filteredTags.map((tag) => {
                        const isSelected = formData.requirement_tag_ids.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setFormData({ ...formData, requirement_tag_ids: formData.requirement_tag_ids.filter(id => id !== tag.id) });
                              } else {
                                setFormData({ ...formData, requirement_tag_ids: [...formData.requirement_tag_ids, tag.id] });
                              }
                            }}
                            disabled={submitting}
                            style={{
                              padding: '0.75rem 1rem',
                              borderRadius: '6px',
                              border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                              background: isSelected ? 'var(--primary-color)' : 'transparent',
                              color: isSelected ? 'white' : 'var(--text-color)',
                              cursor: submitting ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              textAlign: 'center',
                              fontSize: '0.9rem',
                              fontWeight: isSelected ? '600' : '400',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              minHeight: '44px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (!submitting && !isSelected) {
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                e.currentTarget.style.background = 'var(--primary-color)';
                                e.currentTarget.style.color = 'white';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!submitting && !isSelected) {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-color)';
                              }
                            }}
                            title={tag.description ? `${tag.name}: ${tag.description}` : tag.name}
                          >
                            {isSelected && '✓ '}
                            {tag.name}
                          </button>
                            );
                          })}
                          </div>
                        );
                      })()}
                    </>
                  )}
                  {formData.requirement_tag_ids.length > 0 && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Selected:</span>
                      {formData.requirement_tag_ids.map((tagId) => {
                        const tag = requirementTags.find(t => t.id === tagId);
                        if (!tag) return null;
                        return (
                          <span 
                            key={tagId}
                            style={{
                              background: 'var(--primary-color)',
                              color: 'white',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            {tag.name}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, requirement_tag_ids: formData.requirement_tag_ids.filter(id => id !== tagId) });
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.3)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                lineHeight: 1
                              }}
                              disabled={submitting}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Duration (hours, optional)</label>
                  <input
                    type="number"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                    min="0"
                    disabled={submitting}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1 }}>
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditing(null); setRequirementTagSearch(''); }} className="btn-secondary" disabled={submitting} style={{ flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showLocationTags && (
          <LocationTagsManager
            onClose={() => { setShowLocationTags(false); loadLocationTags(); }}
            locationTags={locationTags}
            onTagsUpdate={loadLocationTags}
          />
        )}

        {showRequirementTags && (
          <RequirementTagsManager
            onClose={() => { setShowRequirementTags(false); loadRequirementTags(); }}
            requirementTags={requirementTags}
            onTagsUpdate={loadRequirementTags}
          />
        )}
      </div>
    </>
  );
};

export default Templates;

