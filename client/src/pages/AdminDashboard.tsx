import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import InteractiveMap, { LocationTag, MapPoint } from '../components/InteractiveMap';
import './Dashboard.css';

const AdminDashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <Routes>
        <Route path="/" element={<AdminHome />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/positions" element={<Positions />} />
        <Route path="/scheduled" element={<ScheduledPosts />} />
      </Routes>
    </div>
  );
};

const AdminHome: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="dashboard-nav">
        <h1>Park Volunteer Portal - Admin</h1>
        <div className="nav-links">
          <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>Dashboard</Link>
          <Link to="/admin/templates" className={isActive('/admin/templates') ? 'active' : ''}>Templates</Link>
          <Link to="/admin/positions" className={isActive('/admin/positions') ? 'active' : ''}>Positions</Link>
          <Link to="/admin/scheduled" className={isActive('/admin/scheduled') ? 'active' : ''}>Scheduled Posts</Link>
          <span className="user-info">{user?.name}</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </nav>
      <div className="dashboard-content">
        <h2>Admin Dashboard</h2>
        <div className="admin-stats">
          <div className="stat-card">
            <h3>Quick Actions</h3>
            <Link to="/admin/templates" className="btn-primary">Manage Templates</Link>
            <Link to="/admin/positions" className="btn-primary" style={{ marginTop: '1rem' }}>View Positions</Link>
            <Link to="/admin/scheduled" className="btn-primary" style={{ marginTop: '1rem' }}>Scheduled Posts</Link>
          </div>
        </div>
      </div>
    </>
  );
};

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [locationTags, setLocationTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showLocationTags, setShowLocationTags] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    duration_hours: '',
    location_id: '',
  });
  const { user, logout } = useAuth();
  const location = useLocation();
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadTemplates();
    loadLocationTags();
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
      setFormData({ title: '', description: '', requirements: '', duration_hours: '', location_id: '' });
      loadTemplates();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to save template', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (template: any) => {
    setEditing(template);
    setFormData({
      title: template.title,
      description: template.description,
      requirements: template.requirements || '',
      duration_hours: template.duration_hours || '',
      location_id: template.location_tag_id || template.location_id || '',
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

  const isActive = (path: string) => location.pathname === path;

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
      <nav className="dashboard-nav">
        <h1>Park Volunteer Portal - Admin</h1>
        <div className="nav-links">
          <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>Dashboard</Link>
          <Link to="/admin/templates" className={isActive('/admin/templates') ? 'active' : ''}>Templates</Link>
          <Link to="/admin/positions" className={isActive('/admin/positions') ? 'active' : ''}>Positions</Link>
          <Link to="/admin/scheduled" className={isActive('/admin/scheduled') ? 'active' : ''}>Scheduled Posts</Link>
          <span className="user-info">{user?.name}</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </nav>
      <div className="dashboard-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2>Position Templates</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => setShowLocationTags(true)} className="btn-secondary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
              Manage Locations
            </button>
            <button onClick={() => { setShowForm(true); setEditing(null); setFormData({ title: '', description: '', requirements: '', duration_hours: '', location_id: '' }); }} className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
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
          <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditing(null); } }}>
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
                  <label>Requirements (optional)</label>
                  <textarea
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    rows={3}
                    disabled={submitting}
                  />
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
                <div className="form-group">
                  <label>Location (optional)</label>
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
                  <small style={{ marginTop: '0.5rem', display: 'block' }}>
                    <button 
                      type="button" 
                      onClick={(e) => { e.preventDefault(); setShowLocationTags(true); }}
                      style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                      Manage locations
                    </button>
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1 }}>
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-secondary" disabled={submitting} style={{ flex: 1 }}>
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
      </div>
    </>
  );
};

// Location Tags Management Component
const LocationTagsManager: React.FC<{ onClose: () => void; locationTags: any[]; onTagsUpdate: () => void }> = ({ onClose, locationTags, onTagsUpdate }) => {
  const [tags, setTags] = useState<any[]>(locationTags);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '', map_point: '', map_polygon: '', category: '', visible: true, color: '#4a7c2a' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedTag, setSelectedTag] = useState<LocationTag | null>(null);
  const [editingMode, setEditingMode] = useState<'point' | 'polygon' | 'circle' | 'none'>('none');
  const [showTags, setShowTags] = useState(true);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    setTags(locationTags);
    // Extract unique categories
    const uniqueCategories = Array.from(new Set(
      locationTags
        .map(t => t.category)
        .filter((c): c is string => c !== undefined && c !== null && c !== '')
    )).sort();
    setCategories(uniqueCategories);
    // Initialize visible categories to show all
    if (visibleCategories.size === 0 && uniqueCategories.length > 0) {
      setVisibleCategories(new Set(uniqueCategories));
    }
    // Initialize expanded categories to show all
    if (expandedCategories.size === 0) {
      const allCategories = new Set(uniqueCategories);
      allCategories.add('Uncategorized');
      setExpandedCategories(allCategories);
    }
  }, [locationTags]);

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Group tags by category
  const groupedTags = tags.reduce((acc, tag) => {
    const category = tag.category && tag.category.trim() ? tag.category : 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, typeof tags>);

  // Get sorted category list including Uncategorized
  const allCategoryKeys = [...categories, 'Uncategorized'].filter((cat, index, arr) => arr.indexOf(cat) === index);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const submitData: any = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        visible: formData.visible,
        color: formData.color || null,
      };
      
      if (formData.map_point) {
        submitData.map_point = formData.map_point;
      }
      if (formData.map_polygon) {
        submitData.map_polygon = formData.map_polygon;
      }
      
      if (editing) {
        await adminAPI.updateLocationTag(editing.id, submitData);
        showToast('Location tag updated successfully!', 'success');
      } else {
        await adminAPI.createLocationTag(submitData);
        showToast('Location tag created successfully!', 'success');
      }
      setShowForm(false);
      setEditing(null);
      setFormData({ name: '', description: '', map_point: '', map_polygon: '', category: '', visible: true, color: '#4a7c2a' });
      setEditingMode('none');
      setSelectedTag(null);
      onTagsUpdate();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to save location tag', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tag: any) => {
    setEditing(tag);
    setFormData({
      name: tag.name,
      description: tag.description || '',
      map_point: tag.map_point || '',
      map_polygon: tag.map_polygon || '',
      category: tag.category || '',
      visible: tag.visible !== undefined ? (typeof tag.visible === 'boolean' ? tag.visible : tag.visible === 1) : true,
      color: tag.color || '#4a7c2a'
    });
    setSelectedTag(tag);
    setShowForm(true);
    setEditingMode('none');
  };

  const handleToggleTagVisibility = async (tagId: number, currentVisible: boolean) => {
    try {
      await adminAPI.updateLocationTag(tagId, { visible: !currentVisible });
      showToast('Tag visibility updated', 'success');
      onTagsUpdate();
    } catch (error: any) {
      showToast('Failed to update visibility', 'error');
    }
  };

  const toggleCategoryVisibility = (category: string) => {
    setVisibleCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this location tag?')) return;
    try {
      await adminAPI.deleteLocationTag(id);
      showToast('Location tag deleted successfully', 'success');
      onTagsUpdate();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to delete location tag', 'error');
    }
  };

  const handlePointChange = async (tagId: number, point: MapPoint | null) => {
    const mapPointValue = point ? JSON.stringify(point) : '';
    setFormData({ ...formData, map_point: mapPointValue });
    
    // Only auto-save if editing an existing tag
    if (editing && editing.id === tagId) {
      try {
        await adminAPI.updateLocationTag(tagId, { map_point: mapPointValue });
        setEditing({ ...editing, map_point: mapPointValue });
        onTagsUpdate();
      } catch (error: any) {
        showToast('Failed to save point location', 'error');
      }
    }
  };

  const handlePolygonChange = async (tagId: number, polygon: MapPoint[] | null) => {
    const mapPolygonValue = polygon && polygon.length > 0 ? JSON.stringify(polygon) : '';
    setFormData({ ...formData, map_polygon: mapPolygonValue });
    
    // Only auto-save if editing an existing tag
    if (editing && editing.id === tagId) {
      try {
        await adminAPI.updateLocationTag(tagId, { map_polygon: mapPolygonValue });
        setEditing({ ...editing, map_polygon: mapPolygonValue });
        onTagsUpdate();
      } catch (error: any) {
        showToast('Failed to save polygon area', 'error');
      }
    }
  };

  const handleRemovePoint = async (tagId: number) => {
    try {
      await adminAPI.updateLocationTag(tagId, { map_point: null });
      showToast('Point location removed', 'success');
      onTagsUpdate();
      // Update local state
      const updatedTags = tags.map(t => t.id === tagId ? { ...t, map_point: undefined } : t);
      setTags(updatedTags);
    } catch (error: any) {
      showToast('Failed to remove point location', 'error');
    }
  };

  return (
    <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ padding: 0 }}>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000
      }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
        
        {/* Top Bar */}
        <div style={{
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-color)',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Location Tags Manager</h3>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                padding: '0.5rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                transition: 'all 0.2s'
              }}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={showTags}
                onChange={(e) => setShowTags(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Show All Tags
            </label>
            {categories.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {categories.map((cat) => (
                  <label
                    key={cat}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      padding: '0.3rem 0.6rem',
                      background: visibleCategories.has(cat) ? 'var(--primary-color)' : 'var(--bg-secondary)',
                      color: visibleCategories.has(cat) ? 'white' : 'var(--text-primary)',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleCategories.has(cat)}
                      onChange={() => toggleCategoryVisibility(cat)}
                      style={{ cursor: 'pointer', margin: 0 }}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            )}
            <button onClick={onClose} className="btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }}>Close</button>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Interactive Map - Takes full width */}
          <div style={{ 
            position: 'relative', 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <InteractiveMap
                locationTags={tags}
                selectedTag={selectedTag}
                onTagSelect={setSelectedTag}
                onPointChange={(tagId, point) => {
                  if (editing && editing.id === tagId) {
                    handlePointChange(tagId, point);
                  } else if (showForm && editingMode === 'point') {
                    // For new tags or when editing mode is active, update form data
                    const mapPointValue = point ? JSON.stringify(point) : '';
                    setFormData({ ...formData, map_point: mapPointValue });
                  }
                }}
                onPolygonChange={(tagId, polygon) => {
                  if (editing && editing.id === tagId) {
                    handlePolygonChange(tagId, polygon);
                  } else if (showForm && (editingMode === 'polygon' || editingMode === 'circle')) {
                    // For new tags or when editing mode is active, update form data
                    const mapPolygonValue = polygon && polygon.length > 0 ? JSON.stringify(polygon) : '';
                    setFormData({ ...formData, map_polygon: mapPolygonValue });
                  }
                }}
                editingMode={editingMode}
                mapImageUrl="/domes-facility-map.webp"
                imageBounds={[[0, 0], [1000, 1000]]}
                allowEditingWithoutTag={showForm && !editing}
                showTags={showTags}
                onRemovePoint={handleRemovePoint}
                visibleCategories={visibleCategories}
              />
            {editingMode !== 'none' && (
              <div style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '1rem',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                zIndex: 1000,
                maxWidth: '300px'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--primary-color)' }}>
                  {editingMode === 'point' && '📍 Setting Point Location'}
                  {editingMode === 'polygon' && '🗺️ Drawing Polygon Area'}
                  {editingMode === 'circle' && '⭕ Drawing Circle Area'}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {editingMode === 'point' && 'Click anywhere on the map to set the location point'}
                  {editingMode === 'polygon' && 'Click on the map to add points to the polygon. Click outside the form to finish.'}
                  {editingMode === 'circle' && 'Click to set the center, then move your mouse to adjust the radius. Click again to finish.'}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMode('none')}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  Cancel Editing
                </button>
              </div>
            )}
            </div>
          </div>

          {/* Collapsible Sidebar */}
          <div style={{
            width: sidebarCollapsed ? '0' : '400px',
            background: 'var(--bg-primary)',
            borderLeft: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s ease',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {!sidebarCollapsed && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden'
              }}>
                {/* Tag List */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1rem',
                  borderBottom: showForm ? '1px solid var(--border-color)' : 'none'
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <button
                      onClick={() => {
                        setShowForm(true);
                        setEditing(null);
                        setFormData({ name: '', description: '', map_point: '', map_polygon: '', category: '', visible: true, color: '#4a7c2a' });
                        setSelectedTag(null);
                        setEditingMode('none');
                      }}
                      className="btn-primary"
                      style={{ width: '100%', padding: '0.75rem 1rem' }}
                    >
                      + Create Location Tag
                    </button>
                  </div>

                  {tags.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📍</div>
                      <h3>No location tags yet</h3>
                      <p>Create your first location tag to get started!</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {allCategoryKeys.map((category) => {
                        const categoryTags = groupedTags[category] || [];
                        if (categoryTags.length === 0) return null;
                        const isExpanded = expandedCategories.has(category);
                        
                        return (
                          <div key={category} style={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            overflow: 'hidden'
                          }}>
                            <button
                              onClick={() => toggleCategoryExpansion(category)}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                background: 'var(--bg-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                textAlign: 'left',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                  fontSize: '0.9rem',
                                  transition: 'transform 0.2s',
                                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                  display: 'inline-block'
                                }}>
                                  ▶
                                </span>
                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{category}</span>
                                <span style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-secondary)',
                                  background: 'var(--bg-primary)',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '12px'
                                }}>
                                  {categoryTags.length}
                                </span>
                              </div>
                            </button>
                            {isExpanded && (
                              <div style={{
                                padding: '0.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                              }}>
                                {categoryTags.map((tag: any) => (
                                  <div
                                    key={tag.id}
                                    style={{
                                      background: selectedTag?.id === tag.id ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                                      padding: '0.75rem',
                                      borderRadius: '6px',
                                      border: selectedTag?.id === tag.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                      cursor: 'pointer',
                                      opacity: tag.visible !== undefined && !(typeof tag.visible === 'boolean' ? tag.visible : tag.visible === 1) ? 0.6 : 1,
                                      transition: 'all 0.2s'
                                    }}
                                    onClick={() => {
                                      setSelectedTag(tag);
                                      handleEdit(tag);
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{tag.name}</h4>
                                      <label
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                          cursor: 'pointer',
                                          fontSize: '0.75rem'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={tag.visible !== undefined ? (typeof tag.visible === 'boolean' ? tag.visible : tag.visible === 1) : true}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleToggleTagVisibility(tag.id, typeof tag.visible === 'boolean' ? tag.visible : tag.visible === 1);
                                          }}
                                          style={{ cursor: 'pointer', margin: 0 }}
                                        />
                                      </label>
                                    </div>
                                    {tag.color && (
                                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                          padding: '0.2rem 0.4rem',
                                          background: 'var(--bg-secondary)',
                                          borderRadius: '4px',
                                          fontSize: '0.7rem'
                                        }}>
                                          <span style={{
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '50%',
                                            backgroundColor: tag.color,
                                            border: '1px solid var(--border-color)'
                                          }}></span>
                                        </span>
                                      </div>
                                    )}
                                    {tag.description && (
                                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0', lineHeight: 1.3 }}>
                                        {tag.description.length > 60 ? tag.description.substring(0, 60) + '...' : tag.description}
                                      </p>
                                    )}
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                      {tag.map_point && <span>📍 Point</span>}
                                      {tag.map_polygon && <span style={{ marginLeft: tag.map_point ? '0.5rem' : 0 }}>🗺️ Area</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(tag);
                                        }}
                                        className="btn-secondary"
                                        style={{ flex: 1, padding: '0.3rem', fontSize: '0.8rem' }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(tag.id);
                                        }}
                                        className="btn-danger"
                                        style={{ flex: 1, padding: '0.3rem', fontSize: '0.8rem' }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Form Section */}
                {showForm && (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    padding: '1.5rem',
                    borderTop: '1px solid var(--border-color)',
                    maxHeight: '50%',
                    overflowY: 'auto',
                    boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{editing ? 'Edit Location Tag' : 'Create Location Tag'}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setEditing(null);
                          setSelectedTag(null);
                          setEditingMode('none');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '1.5rem',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                          padding: '0',
                          lineHeight: '1'
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                      <div className="form-group">
                        <label>Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          disabled={submitting}
                        />
                      </div>
                      <div className="form-group">
                        <label>Description (optional)</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          disabled={submitting}
                        />
                      </div>
                      <div className="form-group">
                        <label>Category (optional)</label>
                        <input
                          type="text"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          placeholder="e.g., Buildings, Gardens, Parking"
                          disabled={submitting}
                          list="category-list"
                        />
                        <datalist id="category-list">
                          {categories.map((cat) => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </div>
                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData.visible}
                            onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                            disabled={submitting}
                            style={{ cursor: 'pointer' }}
                          />
                          Visible on map
                        </label>
                      </div>
                      <div className="form-group">
                        <label>Color</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={formData.color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            disabled={submitting}
                            style={{
                              width: '60px',
                              height: '40px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          />
                          <input
                            type="text"
                            value={formData.color}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^#[0-9A-Fa-f]{6}$/.test(value) || value === '') {
                                setFormData({ ...formData, color: value || '#4a7c2a' });
                              }
                            }}
                            placeholder="#4a7c2a"
                            disabled={submitting}
                            style={{ flex: 1 }}
                            pattern="^#[0-9A-Fa-f]{6}$"
                          />
                        </div>
                        <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                          Color for point markers and polygon areas
                        </small>
                      </div>
                      <div className="form-group">
                        <label>Map Location</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setEditingMode(editingMode === 'point' ? 'none' : 'point')}
                            className={editingMode === 'point' ? 'btn-primary' : 'btn-secondary'}
                            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                          >
                            {editingMode === 'point' ? '✓' : ''} Set Point
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMode(editingMode === 'polygon' ? 'none' : 'polygon')}
                            className={editingMode === 'polygon' ? 'btn-primary' : 'btn-secondary'}
                            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                          >
                            {editingMode === 'polygon' ? '✓' : ''} Draw Polygon
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMode(editingMode === 'circle' ? 'none' : 'circle')}
                            className={editingMode === 'circle' ? 'btn-primary' : 'btn-secondary'}
                            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                          >
                            {editingMode === 'circle' ? '✓' : ''} Draw Circle
                          </button>
                        </div>
                        {(editing || formData.map_point || formData.map_polygon) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, map_point: '', map_polygon: '' });
                              if (editing) {
                                handlePointChange(editing.id, null);
                                handlePolygonChange(editing.id, null);
                              }
                            }}
                            className="btn-danger"
                            style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '0.9rem', marginBottom: '0.5rem' }}
                          >
                            Clear Map Data
                          </button>
                        )}
                        <small style={{ color: 'var(--text-secondary)', display: 'block' }}>
                          {editingMode === 'point' && 'Click on the map to set the location point (cannot overlap polygons)'}
                          {editingMode === 'polygon' && 'Click on the map to add points to the polygon area'}
                          {editingMode === 'circle' && 'Click to set center, move mouse to adjust radius, click again to finish'}
                          {editingMode === 'none' && 'Select a drawing mode to add map location'}
                        </small>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1 }}>
                          {submitting ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowForm(false);
                            setEditing(null);
                            setSelectedTag(null);
                            setEditingMode('none');
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const { user, logout } = useAuth();
  const location = useLocation();
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
      await adminAPI.createPosition(formData);
      setShowForm(false);
      setFormData({ template_id: '', date: '', start_time: '', end_time: '', max_volunteers: '' });
      loadPositions();
      showToast('Position created and volunteers notified!', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to create position', 'error');
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

  const isActive = (path: string) => location.pathname === path;

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
      <nav className="dashboard-nav">
        <h1>Park Volunteer Portal - Admin</h1>
        <div className="nav-links">
          <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>Dashboard</Link>
          <Link to="/admin/templates" className={isActive('/admin/templates') ? 'active' : ''}>Templates</Link>
          <Link to="/admin/positions" className={isActive('/admin/positions') ? 'active' : ''}>Positions</Link>
          <Link to="/admin/scheduled" className={isActive('/admin/scheduled') ? 'active' : ''}>Scheduled Posts</Link>
          <span className="user-info">{user?.name}</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </nav>
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
  const { user, logout } = useAuth();
  const location = useLocation();
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

  const isActive = (path: string) => location.pathname === path;

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
      <nav className="dashboard-nav">
        <h1>Park Volunteer Portal - Admin</h1>
        <div className="nav-links">
          <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>Dashboard</Link>
          <Link to="/admin/templates" className={isActive('/admin/templates') ? 'active' : ''}>Templates</Link>
          <Link to="/admin/positions" className={isActive('/admin/positions') ? 'active' : ''}>Positions</Link>
          <Link to="/admin/scheduled" className={isActive('/admin/scheduled') ? 'active' : ''}>Scheduled Posts</Link>
          <span className="user-info">{user?.name}</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </nav>
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

export default AdminDashboard;

