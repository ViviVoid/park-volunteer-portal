import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import '../pages/Dashboard.css';

interface RequirementTagsManagerProps {
  onClose: () => void;
  requirementTags: any[];
  onTagsUpdate: () => void;
}

const RequirementTagsManager: React.FC<RequirementTagsManagerProps> = ({ 
  onClose, 
  requirementTags, 
  onTagsUpdate 
}) => {
  const [tags, setTags] = useState<any[]>(requirementTags);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '' 
  });
  const [submitting, setSubmitting] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    setTags(requirementTags);
  }, [requirementTags]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await adminAPI.updateRequirementTag(editing.id, formData);
        showToast('Requirement tag updated successfully!', 'success');
      } else {
        await adminAPI.createRequirementTag(formData);
        showToast('Requirement tag created successfully!', 'success');
      }
      setShowForm(false);
      setEditing(null);
      setFormData({ name: '', description: '' });
      setSearchQuery('');
      onTagsUpdate();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to save requirement tag', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tag: any) => {
    setEditing(tag);
    setFormData({
      name: tag.name,
      description: tag.description || ''
    });
    setSearchQuery('');
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this requirement tag?')) return;
    try {
      await adminAPI.deleteRequirementTag(id);
      showToast('Requirement tag deleted successfully', 'success');
      onTagsUpdate();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to delete requirement tag', 'error');
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
      <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) { onClose(); } }}>
        <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>Manage Requirement Tags</h2>
            <button onClick={onClose} className="btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
              Close
            </button>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <button 
              onClick={() => { 
                setShowForm(true); 
                setEditing(null); 
                setFormData({ name: '', description: '' });
                setSearchQuery('');
              }} 
              className="btn-primary"
              style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
            >
              Create Requirement Tag
            </button>
          </div>

          {showForm && (
            <div style={{ 
              background: 'var(--card-bg)', 
              padding: '1.5rem', 
              borderRadius: '8px', 
              marginBottom: '1.5rem',
              border: '1px solid var(--border-color)'
            }}>
              <h3 style={{ marginBottom: '1rem' }}>{editing ? 'Edit Requirement Tag' : 'Create Requirement Tag'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={submitting}
                    placeholder="e.g., First Aid Certified, Background Check Required"
                  />
                </div>
                <div className="form-group">
                  <label>Description (optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    disabled={submitting}
                    placeholder="Additional details about this requirement"
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1 }}>
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditing(null);
                      setFormData({ name: '', description: '' });
                      setSearchQuery('');
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
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: 0 }}>Existing Requirement Tags</h3>
              {tags.length > 0 && (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {tags.length} tag{tags.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {tags.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <p>No requirement tags yet. Create your first one!</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Search requirement tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                  const searchLower = searchQuery.toLowerCase().trim();
                  const filteredTags = searchQuery
                    ? tags.filter(tag => 
                        tag.name.toLowerCase().includes(searchLower) ||
                        (tag.description && tag.description.toLowerCase().includes(searchLower))
                      )
                    : tags;
                  
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
                          {searchQuery ? `No requirement tags found matching "${searchQuery}"` : 'No requirement tags yet. Create your first one!'}
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {filteredTags.map((tag) => (
                  <div 
                    key={tag.id} 
                    style={{ 
                      background: 'var(--card-bg)', 
                      padding: '1rem', 
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>{tag.name}</h4>
                      {tag.description && (
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          {tag.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleEdit(tag)} 
                        className="btn-secondary" 
                        style={{ width: 'auto', padding: '0.5rem 1rem' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(tag.id)} 
                        className="btn-danger" 
                        style={{ width: 'auto', padding: '0.5rem 1rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RequirementTagsManager;

