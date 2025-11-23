import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import AdminNav from '../../components/AdminNav';
import LocationTagsManager from '../../components/LocationTagsManager';
import RequirementTagsManager from '../../components/RequirementTagsManager';
import '../Dashboard.css';

type TabType = 'templates' | 'positions' | 'scheduled';

const VolunteerManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('templates');
  
  // Templates state
  const [templates, setTemplates] = useState<any[]>([]);
  const [locationTags, setLocationTags] = useState<any[]>([]);
  const [requirementTags, setRequirementTags] = useState<any[]>([]);
  const [requirementTagSearch, setRequirementTagSearch] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showLocationTags, setShowLocationTags] = useState(false);
  const [showRequirementTags, setShowRequirementTags] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateFormData, setTemplateFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    duration_hours: '',
    location_id: '',
    requirement_tag_ids: [] as number[],
  });

  // Positions state
  const [positions, setPositions] = useState<any[]>([]);
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [notifying, setNotifying] = useState<number | null>(null);
  const [positionFormData, setPositionFormData] = useState({
    template_id: '',
    date: '',
    start_time: '',
    end_time: '',
    max_volunteers: '',
  });

  // Scheduled Posts state
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [showScheduledForm, setShowScheduledForm] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [scheduledFormData, setScheduledFormData] = useState({
    template_id: '',
    cron_expression: '',
    days_ahead: '7',
  });
  const [scheduleOptions, setScheduleOptions] = useState({
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    time: '09:00',
    daysOfWeek: [] as number[], // 0 = Sunday, 1 = Monday, etc.
    dayOfMonth: '1', // For monthly
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadTemplates(),
      loadPositions(),
      loadScheduled(),
      loadLocationTags(),
      loadRequirementTags(),
    ]);
    setLoading(false);
  };

  // Templates functions
  const loadTemplates = async () => {
    try {
      const response = await adminAPI.getTemplates();
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      showToast('Failed to load templates', 'error');
    }
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingTemplate) {
        await adminAPI.updateTemplate(editingTemplate.id, templateFormData);
        showToast('Template updated successfully!', 'success');
      } else {
        await adminAPI.createTemplate(templateFormData);
        showToast('Template created successfully!', 'success');
      }
      setShowTemplateForm(false);
      setEditingTemplate(null);
      setRequirementTagSearch('');
      setTemplateFormData({ title: '', description: '', requirements: '', duration_hours: '', location_id: '', requirement_tag_ids: [] });
      loadTemplates();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to save template', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setRequirementTagSearch('');
    setTemplateFormData({
      title: template.title,
      description: template.description,
      requirements: template.requirements || '',
      duration_hours: template.duration_hours || '',
      location_id: template.location_tag_id || template.location_id || '',
      requirement_tag_ids: template.requirement_tags ? template.requirement_tags.map((tag: any) => tag.id) : [],
    });
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await adminAPI.deleteTemplate(id);
      showToast('Template deleted successfully', 'success');
      loadTemplates();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to delete template', 'error');
    }
  };

  // Positions functions
  const loadPositions = async () => {
    try {
      const response = await adminAPI.getPositions();
      setPositions(response.data);
    } catch (error) {
      console.error('Failed to load positions:', error);
      showToast('Failed to load positions', 'error');
    }
  };

  const handlePositionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Convert form data to proper types
      const positionData = {
        template_id: parseInt(positionFormData.template_id, 10),
        date: positionFormData.date, // Date input already provides ISO8601 format
        start_time: positionFormData.start_time, // Time input provides HH:MM format
        end_time: positionFormData.end_time || undefined,
        max_volunteers: positionFormData.max_volunteers ? parseInt(positionFormData.max_volunteers, 10) : undefined
      };
      await adminAPI.createPosition(positionData);
      setShowPositionForm(false);
      setPositionFormData({ template_id: '', date: '', start_time: '', end_time: '', max_volunteers: '' });
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

  // Scheduled Posts functions
  const loadScheduled = async () => {
    try {
      const response = await adminAPI.getScheduledPosts();
      setScheduled(response.data);
    } catch (error) {
      console.error('Failed to load scheduled posts:', error);
      showToast('Failed to load scheduled posts', 'error');
    }
  };

  // Convert user-friendly schedule options to cron expression
  const generateCronExpression = (): string => {
    const [hours, minutes] = scheduleOptions.time.split(':');
    const minute = minutes || '0';
    const hour = hours || '9';

    switch (scheduleOptions.frequency) {
      case 'daily':
        // Every day at specified time: "minute hour * * *"
        return `${minute} ${hour} * * *`;
      
      case 'weekly':
        // Weekly on selected days: "minute hour * * weekday"
        if (scheduleOptions.daysOfWeek.length === 0) {
          return `${minute} ${hour} * * 1`; // Default to Monday if none selected
        }
        // For multiple days, we'll use the first day (cron limitation)
        // In a full implementation, you might want to create multiple scheduled posts
        const firstDay = scheduleOptions.daysOfWeek[0];
        return `${minute} ${hour} * * ${firstDay}`;
      
      case 'monthly':
        // Monthly on specific day: "minute hour day * *"
        const day = scheduleOptions.dayOfMonth || '1';
        return `${minute} ${hour} ${day} * *`;
      
      default:
        return `${minute} ${hour} * * *`;
    }
  };

  // Parse cron expression to human-readable format
  const parseCronExpression = (cronExpr: string): string => {
    const parts = cronExpr.split(' ');
    if (parts.length !== 5) return cronExpr;

    const [minute, hour, day, month, weekday] = parts;
    
    // Format time
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);
    const time12h = new Date(2000, 0, 1, hourNum, minuteNum).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Daily schedule
    if (day === '*' && month === '*' && weekday === '*') {
      return `Daily at ${time12h}`;
    } 
    // Weekly schedule
    else if (day === '*' && month === '*' && weekday !== '*') {
      const weekdayNum = parseInt(weekday);
      // Handle both 0-6 (where 0=Sunday) and 0-7 (where 7=Sunday) formats
      const dayIndex = weekdayNum === 7 ? 0 : weekdayNum % 7;
      const dayName = dayNames[dayIndex];
      return `Every ${dayName} at ${time12h}`;
    } 
    // Monthly schedule
    else if (day !== '*' && month === '*' && weekday === '*') {
      const dayNum = parseInt(day);
      const suffix = dayNum === 1 ? 'st' : dayNum === 2 ? 'nd' : dayNum === 3 ? 'rd' : 'th';
      return `Monthly on the ${dayNum}${suffix} at ${time12h}`;
    }
    
    // Fallback: return the cron expression
    return cronExpr;
  };

  const handleScheduledSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate weekly schedule has at least one day selected
    if (scheduleOptions.frequency === 'weekly' && scheduleOptions.daysOfWeek.length === 0) {
      showToast('Please select at least one day for weekly schedules', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      // Generate cron expression from user-friendly options
      const cronExpression = generateCronExpression();
      const submitData = {
        ...scheduledFormData,
        cron_expression: cronExpression,
      };
      await adminAPI.createScheduledPost(submitData);
      setShowScheduledForm(false);
      setScheduledFormData({ template_id: '', cron_expression: '', days_ahead: '7' });
      setScheduleOptions({
        frequency: 'daily',
        time: '09:00',
        daysOfWeek: [],
        dayOfMonth: '1',
      });
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

  const handleDeleteScheduled = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this recurring schedule? This action cannot be undone.')) return;
    setDeleting(id);
    try {
      await adminAPI.deleteScheduledPost(id);
      showToast('Recurring schedule deleted successfully', 'success');
      loadScheduled();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to delete recurring schedule', 'error');
    } finally {
      setDeleting(null);
    }
  };

  // Location and Requirement Tags
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

  const renderTemplatesTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Opportunity Templates</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Create reusable templates for volunteer opportunities
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setShowRequirementTags(true)} className="btn-secondary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
            Manage Requirement Tags
          </button>
          <button onClick={() => setShowLocationTags(true)} className="btn-secondary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
            Manage Locations
          </button>
          <button 
            onClick={() => { 
              setShowTemplateForm(true); 
              setEditingTemplate(null); 
              setRequirementTagSearch(''); 
              setTemplateFormData({ title: '', description: '', requirements: '', duration_hours: '', location_id: '', requirement_tag_ids: [] }); 
            }} 
            className="btn-primary" 
            style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
          >
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
                <button onClick={() => handleEditTemplate(template)} className="btn-secondary" style={{ width: 'auto', flex: 1 }}>Edit</button>
                <button onClick={() => handleDeleteTemplate(template.id)} className="btn-danger" style={{ width: 'auto', flex: 1 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showTemplateForm && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) { setShowTemplateForm(false); setEditingTemplate(null); setRequirementTagSearch(''); } }}>
          <div className="modal-content">
            <h3>{editingTemplate ? 'Edit Template' : 'Create Template'}</h3>
            <form onSubmit={handleTemplateSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={templateFormData.title}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, title: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={templateFormData.description}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
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
                  value={templateFormData.location_id}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, location_id: e.target.value })}
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
                  value={templateFormData.requirements}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, requirements: e.target.value })}
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
                            const isSelected = templateFormData.requirement_tag_ids.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setTemplateFormData({ ...templateFormData, requirement_tag_ids: templateFormData.requirement_tag_ids.filter(id => id !== tag.id) });
                                  } else {
                                    setTemplateFormData({ ...templateFormData, requirement_tag_ids: [...templateFormData.requirement_tag_ids, tag.id] });
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
                {templateFormData.requirement_tag_ids.length > 0 && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Selected:</span>
                    {templateFormData.requirement_tag_ids.map((tagId) => {
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
                              setTemplateFormData({ ...templateFormData, requirement_tag_ids: templateFormData.requirement_tag_ids.filter(id => id !== tagId) });
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
                  value={templateFormData.duration_hours}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, duration_hours: e.target.value })}
                  min="0"
                  disabled={submitting}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1 }}>
                  {submitting ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={() => { setShowTemplateForm(false); setEditingTemplate(null); setRequirementTagSearch(''); }} className="btn-secondary" disabled={submitting} style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderPositionsTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Active Opportunities</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Manage posted volunteer positions and notify volunteers
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => setShowLocationTags(true)} className="btn-secondary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
            Manage Locations
          </button>
          <button onClick={() => setShowPositionForm(true)} className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
            Post New Opportunity
          </button>
        </div>
      </div>

      {showPositionForm && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setShowPositionForm(false); }}>
          <div className="modal-content">
            <h3>Post Opportunity from Template</h3>
            <form onSubmit={handlePositionSubmit}>
              <div className="form-group">
                <label>Template</label>
                <select
                  value={positionFormData.template_id}
                  onChange={(e) => setPositionFormData({ ...positionFormData, template_id: e.target.value })}
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
                  value={positionFormData.date}
                  onChange={(e) => setPositionFormData({ ...positionFormData, date: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={positionFormData.start_time}
                  onChange={(e) => setPositionFormData({ ...positionFormData, start_time: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label>End Time (optional)</label>
                <input
                  type="time"
                  value={positionFormData.end_time}
                  onChange={(e) => setPositionFormData({ ...positionFormData, end_time: e.target.value })}
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label>Max Volunteers (optional)</label>
                <input
                  type="number"
                  value={positionFormData.max_volunteers}
                  onChange={(e) => setPositionFormData({ ...positionFormData, max_volunteers: e.target.value })}
                  min="1"
                  disabled={submitting}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1 }}>
                  {submitting ? 'Posting...' : 'Post & Notify'}
                </button>
                <button type="button" onClick={() => setShowPositionForm(false)} className="btn-secondary" disabled={submitting} style={{ flex: 1 }}>
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
    </div>
  );

  const renderScheduledTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Recurring Opportunities</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Automatically post opportunities on a recurring schedule
          </p>
        </div>
        <button 
          onClick={() => {
            setShowScheduledForm(true);
            setScheduleOptions({
              frequency: 'daily',
              time: '09:00',
              daysOfWeek: [],
              dayOfMonth: '1',
            });
          }} 
          className="btn-primary" 
          style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
        >
          Create Recurring Schedule
        </button>
      </div>

      {showScheduledForm && (
        <div className="modal" onClick={(e) => { 
          if (e.target === e.currentTarget) {
            setShowScheduledForm(false);
            setScheduleOptions({
              frequency: 'daily',
              time: '09:00',
              daysOfWeek: [],
              dayOfMonth: '1',
            });
          }
        }}>
          <div className="modal-content">
            <h3>Create Recurring Schedule</h3>
            <form onSubmit={handleScheduledSubmit}>
              <div className="form-group">
                <label>Template</label>
                <select
                  value={scheduledFormData.template_id}
                  onChange={(e) => setScheduledFormData({ ...scheduledFormData, template_id: e.target.value })}
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
                <label>Schedule Frequency</label>
                <select
                  value={scheduleOptions.frequency}
                  onChange={(e) => setScheduleOptions({ 
                    ...scheduleOptions, 
                    frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                    daysOfWeek: e.target.value === 'weekly' ? scheduleOptions.daysOfWeek : []
                  })}
                  disabled={submitting}
                  style={{ marginBottom: '1rem' }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

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
                            transition: 'all 0.2s ease',
                            fontSize: '0.9rem'
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  {scheduleOptions.daysOfWeek.length === 0 && (
                    <small style={{ color: 'var(--danger-color)' }}>
                      Please select at least one day
                    </small>
                  )}
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
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '6px',
                  marginTop: '0.5rem'
                }}>
                  <strong>Schedule Preview:</strong> {(() => {
                    const cronExpr = generateCronExpression();
                    return parseCronExpression(cronExpr);
                  })()}
                </div>
              </div>
              <div className="form-group">
                <label>Days Ahead</label>
                <input
                  type="number"
                  value={scheduledFormData.days_ahead}
                  onChange={(e) => setScheduledFormData({ ...scheduledFormData, days_ahead: e.target.value })}
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
                <button 
                  type="button" 
                  onClick={() => {
                    setShowScheduledForm(false);
                    setScheduleOptions({
                      frequency: 'daily',
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
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)'
              }}>
                <p style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: '600',
                  color: 'var(--primary-color)',
                  margin: 0,
                  marginBottom: '0.25rem'
                }}>
                  📅 {parseCronExpression(item.cron_expression)}
                </p>
                <p style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--text-secondary)', 
                  margin: 0,
                  fontFamily: 'monospace'
                }}>
                  {item.cron_expression}
                </p>
              </div>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Posts:</strong> {item.days_ahead} day{item.days_ahead !== 1 ? 's' : ''} in advance
              </p>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Status:</strong> {item.is_active ? <span className="badge success">Active</span> : <span className="badge cancelled">Inactive</span>}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  onClick={() => handleToggle(item.id)}
                  className={item.is_active ? 'btn-secondary' : 'btn-primary'}
                  disabled={toggling === item.id || deleting === item.id}
                  style={{ flex: 1 }}
                >
                  {toggling === item.id ? 'Updating...' : item.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDeleteScheduled(item.id)}
                  className="btn-danger"
                  disabled={toggling === item.id || deleting === item.id}
                  style={{ flex: 1 }}
                >
                  {deleting === item.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

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
        {/* Tab Navigation */}
        <div style={{ 
          borderBottom: '2px solid var(--border-color)', 
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem'
        }}>
          <button
            onClick={() => setActiveTab('templates')}
            style={{
              padding: '1rem 2rem',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'templates' ? '3px solid var(--primary-color)' : '3px solid transparent',
              color: activeTab === 'templates' ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'templates' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s ease'
            }}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            style={{
              padding: '1rem 2rem',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'positions' ? '3px solid var(--primary-color)' : '3px solid transparent',
              color: activeTab === 'positions' ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'positions' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s ease'
            }}
          >
            Active Opportunities
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            style={{
              padding: '1rem 2rem',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'scheduled' ? '3px solid var(--primary-color)' : '3px solid transparent',
              color: activeTab === 'scheduled' ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'scheduled' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s ease'
            }}
          >
            Recurring Schedules
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'templates' && renderTemplatesTab()}
        {activeTab === 'positions' && renderPositionsTab()}
        {activeTab === 'scheduled' && renderScheduledTab()}

        {/* Modals */}
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

export default VolunteerManagement;

