import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import InteractiveMap, { LocationTag, MapPoint } from './InteractiveMap';
import '../pages/Dashboard.css';

interface LocationTagsManagerProps {
  onClose?: () => void;
  locationTags?: any[];
  onTagsUpdate?: () => void;
}

const LocationTagsManager: React.FC<LocationTagsManagerProps> = ({ 
  onClose, 
  locationTags = [], 
  onTagsUpdate
}) => {
  const [tags, setTags] = useState<any[]>(locationTags);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    map_point: '', 
    map_polygon: '', 
    category: '', 
    visible: true, 
    color: '#4a7c2a'
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedTag, setSelectedTag] = useState<LocationTag | null>(null);
  const [editingMode, setEditingMode] = useState<'point' | 'polygon' | 'circle' | 'none'>('none');
  const [showTags, setShowTags] = useState(true);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth <= 768); // Auto-collapse on mobile
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [imageBounds, setImageBounds] = useState<[[number, number], [number, number]]>([[0, 0], [1000, 1000]]);
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [maps, setMaps] = useState<any[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [currentMap, setCurrentMap] = useState<any>(null);
  const [showMapForm, setShowMapForm] = useState(false);
  const [mapFormData, setMapFormData] = useState({ name: '', is_default: false });
  const { toasts, showToast, removeToast } = useToast();
  const tagRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const visibilityMenuRef = useRef<HTMLDivElement | null>(null);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Auto-collapse sidebar on mobile
      if (mobile && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarCollapsed]);

  // Load maps on mount
  useEffect(() => {
    loadMaps();
  }, []);

  // Load tags when map changes
  useEffect(() => {
    if (selectedMapId !== null) {
      loadTagsForMap(selectedMapId);
    } else {
      setTags([]);
    }
  }, [selectedMapId]);

  // Load image and calculate proper bounds when map changes
  useEffect(() => {
    if (currentMap && currentMap.image_url) {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Allow CORS if needed
      img.onload = () => {
        const height = img.naturalHeight;
        const width = img.naturalWidth;
        setImageBounds([[0, 0], [height, width]]);
      };
      img.onerror = (e) => {
        console.warn('Failed to load map image:', currentMap.image_url, e);
      };
      // Construct full URL for the image
      const imageUrl = currentMap.image_url.startsWith('http') 
        ? currentMap.image_url 
        : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${currentMap.image_url}`;
      console.log('Loading map image from:', imageUrl);
      img.src = imageUrl;
    }
  }, [currentMap]);

  const loadMaps = async () => {
    try {
      const response = await adminAPI.getMaps();
      const mapsData = response.data;
      setMaps(mapsData);
      
      // Set default map or first map
      const defaultMap = mapsData.find((m: any) => m.is_default === 1) || mapsData[0];
      if (defaultMap) {
        setSelectedMapId(defaultMap.id);
        setCurrentMap(defaultMap);
      } else {
        // No maps available
        setSelectedMapId(null);
        setCurrentMap(null);
      }
    } catch (error: any) {
      console.error('Failed to load maps:', error);
      showToast('Failed to load maps', 'error');
      setMaps([]);
      setSelectedMapId(null);
      setCurrentMap(null);
    }
  };

  const loadTagsForMap = async (mapId: number) => {
    try {
      const response = await adminAPI.getLocationTags(mapId);
      setTags(response.data);
      onTagsUpdate?.();
    } catch (error: any) {
      showToast('Failed to load location tags', 'error');
      setTags([]);
    }
  };

  const handleMapChange = (mapId: number | null) => {
    setSelectedMapId(mapId);
    const map = maps.find(m => m.id === mapId);
    setCurrentMap(map || null);
    setSelectedTag(null);
    setEditing(null);
    setShowForm(false);
    setEditingMode('none');
  };

  const handleCreateMap = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', mapFormData.name);
    formData.append('is_default', mapFormData.is_default ? 'true' : 'false');
    
    const fileInput = document.getElementById('map-image-input') as HTMLInputElement;
    if (!fileInput?.files?.[0]) {
      showToast('Please select an image file', 'error');
      return;
    }
    formData.append('image', fileInput.files[0]);

    try {
      await adminAPI.createMap(formData);
      showToast('Map created successfully', 'success');
      setShowMapForm(false);
      setMapFormData({ name: '', is_default: false });
      loadMaps();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to create map', 'error');
    }
  };

  // Create a new map from a selected polygon/circle area
  const handleCreateMapFromArea = async () => {
    if (!currentMap || !currentMap.image_url) {
      showToast('No map image available', 'error');
      return;
    }

    const polygon = formData.map_polygon ? JSON.parse(formData.map_polygon) : null;
    if (!polygon || polygon.length === 0) {
      showToast('Please select a polygon or circle area first', 'error');
      return;
    }

    // Get bounds of the polygon
    const xs = polygon.map((p: MapPoint) => p.x);
    const ys = polygon.map((p: MapPoint) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Calculate pixel bounds from normalized coordinates
    const [[south, west], [north, east]] = imageBounds;
    const width = east - west;
    const height = north - south;
    
    const pixelMinX = minX * width;
    const pixelMaxX = maxX * width;
    const pixelMinY = minY * height;
    const pixelMaxY = maxY * height;
    
    const cropWidth = pixelMaxX - pixelMinX;
    const cropHeight = pixelMaxY - pixelMinY;

    try {
      // Load the image
      const imageUrl = currentMap.image_url.startsWith('http') 
        ? currentMap.image_url 
        : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${currentMap.image_url}`;
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Create canvas and crop
      const canvas = document.createElement('canvas');
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        showToast('Failed to create canvas', 'error');
        return;
      }

      // Draw the cropped portion
      ctx.drawImage(
        img,
        pixelMinX, pixelMinY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('Failed to crop image', 'error');
          return;
        }

        // Prompt for map name
        const mapName = prompt('Enter a name for the new map:');
        if (!mapName || !mapName.trim()) {
          return;
        }

        // Create FormData and upload
        const formData = new FormData();
        formData.append('name', mapName.trim());
        formData.append('is_default', 'false');
        formData.append('image', blob, `${mapName.replace(/\s+/g, '-').toLowerCase()}.png`);
        formData.append('parent_map_id', currentMap.id.toString());
        formData.append('crop_bounds', JSON.stringify({ minX, maxX, minY, maxY }));

        try {
          await adminAPI.createMap(formData);
          showToast('Map created from selected area successfully!', 'success');
          loadMaps();
        } catch (error: any) {
          showToast(error.response?.data?.error || 'Failed to create map', 'error');
        }
      }, 'image/png');
    } catch (error: any) {
      console.error('Error creating map from area:', error);
      showToast('Failed to create map from area', 'error');
    }
  };

  const handleUpdateMapDefault = async (mapId: number, isDefault: boolean) => {
    try {
      const formData = new FormData();
      formData.append('is_default', isDefault ? 'true' : 'false');
      await adminAPI.updateMap(mapId, formData);
      showToast('Map updated successfully', 'success');
      loadMaps();
    } catch (error: any) {
      showToast('Failed to update map', 'error');
    }
  };

  const handleDeleteMap = async (mapId: number) => {
    if (!window.confirm('Are you sure you want to delete this map? This action cannot be undone.')) {
      return;
    }

    try {
      await adminAPI.deleteMap(mapId);
      showToast('Map deleted successfully', 'success');
      
      // If the deleted map was selected, switch to another map
      if (selectedMapId === mapId) {
        const remainingMaps = maps.filter(m => m.id !== mapId);
        if (remainingMaps.length > 0) {
          const defaultMap = remainingMaps.find((m: any) => m.is_default === 1) || remainingMaps[0];
          setSelectedMapId(defaultMap.id);
          setCurrentMap(defaultMap);
        } else {
          setSelectedMapId(null);
          setCurrentMap(null);
        }
      }
      
      loadMaps();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to delete map', 'error');
    }
  };

  useEffect(() => {
    // Extract unique categories
    const uniqueCategories = Array.from(new Set(
      tags
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
  }, [tags]);

  // Scroll to and highlight selected tag when it changes (e.g., from map click)
  useEffect(() => {
    if (selectedTag && !sidebarCollapsed) {
      const tagElement = tagRefs.current[selectedTag.id];
      if (tagElement) {
        // Ensure the category is expanded
        const category = selectedTag.category && selectedTag.category.trim() ? selectedTag.category : 'Uncategorized';
        if (!expandedCategories.has(category)) {
          setExpandedCategories(prev => new Set(prev).add(category));
        }
        
        // Scroll to the tag element
        setTimeout(() => {
          tagElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100); // Small delay to ensure category expansion animation completes
      }
    }
  }, [selectedTag, sidebarCollapsed, expandedCategories]);

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
        map_id: selectedMapId,
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
        if (selectedMapId) {
          loadTagsForMap(selectedMapId);
        }
      } else {
        await adminAPI.createLocationTag(submitData);
        showToast('Location tag created successfully!', 'success');
        if (selectedMapId) {
          loadTagsForMap(selectedMapId);
        }
      }
      setShowForm(false);
      setEditing(null);
      setFormData({ name: '', description: '', map_point: '', map_polygon: '', category: '', visible: true, color: '#4a7c2a' });
      setEditingMode('none');
      setSelectedTag(null);
      if (selectedMapId) {
        loadTagsForMap(selectedMapId);
      }
      onTagsUpdate?.();
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
      if (selectedMapId) {
        loadTagsForMap(selectedMapId);
      }
      onTagsUpdate?.();
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

  const selectAllCategories = () => {
    setVisibleCategories(new Set(categories));
  };

  const deselectAllCategories = () => {
    setVisibleCategories(new Set());
  };

  // Close visibility menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (visibilityMenuRef.current && !visibilityMenuRef.current.contains(event.target as Node)) {
        setShowVisibilityMenu(false);
      }
    };

    if (showVisibilityMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showVisibilityMenu]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this location tag?')) return;
    try {
      await adminAPI.deleteLocationTag(id);
      showToast('Location tag deleted successfully', 'success');
      if (selectedMapId) {
        loadTagsForMap(selectedMapId);
      }
      onTagsUpdate?.();
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
        onTagsUpdate?.();
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
        onTagsUpdate?.();
      } catch (error: any) {
        showToast('Failed to save polygon area', 'error');
      }
    }
  };

  const handleRemovePoint = async (tagId: number) => {
    try {
      await adminAPI.updateLocationTag(tagId, { map_point: null });
      showToast('Point location removed', 'success');
      onTagsUpdate?.();
      // Update local state
      const updatedTags = tags.map(t => t.id === tagId ? { ...t, map_point: undefined } : t);
      setTags(updatedTags);
      // Update form data if editing this tag
      if (editing && editing.id === tagId) {
        setFormData({ ...formData, map_point: '' });
        setEditing({ ...editing, map_point: undefined });
      }
      if (selectedMapId) {
        loadTagsForMap(selectedMapId);
      }
    } catch (error: any) {
      showToast('Failed to remove point location', 'error');
    }
  };

  return (
    <div className="modal" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }} style={{ padding: 0 }}>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        height: '100vh',
        overflow: 'hidden'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Interactive Map</h3>
            {/* Map Selection Dropdown */}
            {maps.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Map:</label>
                <select
                  value={selectedMapId || ''}
                  onChange={(e) => handleMapChange(e.target.value ? parseInt(e.target.value) : null)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    minWidth: '200px'
                  }}
                >
                  {maps.map((map) => (
                    <option key={map.id} value={map.id}>
                      {map.name} {map.is_default === 1 ? '⭐' : ''}
                    </option>
                  ))}
                </select>
                {!isMobile && (
                  <>
                    {currentMap && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={currentMap.is_default === 1}
                          onChange={(e) => handleUpdateMapDefault(currentMap.id, e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        Default
                      </label>
                    )}
                    <button
                      onClick={() => setShowMapForm(true)}
                      className="btn-secondary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      + New Map
                    </button>
                    {currentMap && (
                      <button
                        onClick={() => handleDeleteMap(currentMap.id)}
                        className="btn-danger"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                        title="Delete current map"
                      >
                        🗑️ Delete Map
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {/* Visibility Filter Menu */}
            <div style={{ position: 'relative' }} ref={visibilityMenuRef}>
              <button
                onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                className="btn-secondary"
                style={{
                  width: 'auto',
                  padding: '0.5rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                <span>Visibility</span>
                <span style={{ fontSize: '0.7rem' }}>{showVisibilityMenu ? '▲' : '▼'}</span>
              </button>
              
              {showVisibilityMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  minWidth: '220px',
                  zIndex: 1001,
                  padding: '0.5rem'
                }}>
                  {/* Show All Tags */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={showTags}
                      onChange={(e) => setShowTags(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Show All Tags</span>
                  </label>
                  
                  {categories.length > 0 && (
                    <>
                      <div style={{
                        height: '1px',
                        background: 'var(--border-color)',
                        margin: '0.5rem 0'
                      }} />
                      
                      {/* Category Header */}
                      <div style={{
                        padding: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Categories
                      </div>
                      
                      {/* Select All / Deselect All */}
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        marginBottom: '0.25rem'
                      }}>
                        <button
                          onClick={selectAllCategories}
                          style={{
                            flex: 1,
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        >
                          Select All
                        </button>
                        <button
                          onClick={deselectAllCategories}
                          style={{
                            flex: 1,
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        >
                          Deselect All
                        </button>
                      </div>
                      
                      {/* Category Checkboxes */}
                      <div style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}>
                        {categories.map((cat) => (
                          <label
                            key={cat}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              cursor: 'pointer',
                              padding: '0.5rem',
                              borderRadius: '4px',
                              transition: 'background 0.2s',
                              fontSize: '0.85rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <input
                              type="checkbox"
                              checked={visibleCategories.has(cat)}
                              onChange={() => toggleCategoryVisibility(cat)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{
                              flex: 1,
                              color: visibleCategories.has(cat) ? 'var(--text-primary)' : 'var(--text-secondary)'
                            }}>
                              {cat}
                            </span>
                            {visibleCategories.has(cat) && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--primary-color)' }}>✓</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {onClose && (
              <button onClick={onClose} className="btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }}>Close</button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: isMobile ? '50vh' : 'auto' }}>
          {/* Interactive Map - Takes full width */}
          <div style={{ 
            position: 'relative', 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: isMobile ? '50vh' : 'auto'
          }}>
            <div style={{ flex: 1, position: 'relative', minHeight: isMobile ? '50vh' : 'auto' }}>
              {!currentMap ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
                  <h3>No Map Selected</h3>
                  <p>Please select a map from the dropdown above or create a new map.</p>
                  {maps.length === 0 && (
                    <button
                      onClick={() => setShowMapForm(true)}
                      className="btn-primary"
                      style={{ marginTop: '1rem', padding: '0.75rem 1.5rem' }}
                    >
                      Create Your First Map
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <InteractiveMap
                    locationTags={(() => {
                      // Include preview tags from form data
                      const previewTags = [...tags];
                      
                      // Add preview tag for new tag being created
                      if (showForm && !editing && (formData.map_point || formData.map_polygon)) {
                        previewTags.push({
                          id: -1, // Temporary ID for preview
                          name: formData.name || 'New Tag',
                          description: formData.description,
                          map_point: formData.map_point || undefined,
                          map_polygon: formData.map_polygon || undefined,
                          category: formData.category,
                          visible: formData.visible,
                          color: formData.color || '#4a7c2a',
                          map_id: selectedMapId || undefined
                        });
                      }
                      
                      // Update preview for tag being edited
                      if (showForm && editing) {
                        const index = previewTags.findIndex(t => t.id === editing.id);
                        if (index >= 0) {
                          previewTags[index] = {
                            ...previewTags[index],
                            map_point: formData.map_point || previewTags[index].map_point,
                            map_polygon: formData.map_polygon || previewTags[index].map_polygon,
                            color: formData.color || previewTags[index].color
                          };
                        }
                      }
                      
                      return previewTags;
                    })()}
                    selectedTag={selectedTag}
                    onTagSelect={(tag) => {
                      setSelectedTag(tag);
                      // If sidebar is open and tag is clicked from map, ensure it's visible
                      if (tag && !sidebarCollapsed) {
                        handleEdit(tag);
                      }
                    }}
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
                    mapImageUrl={currentMap?.image_url 
                      ? (currentMap.image_url.startsWith('http') 
                          ? currentMap.image_url 
                          : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${currentMap.image_url}`)
                      : ''}
                    imageBounds={currentMap?.image_bounds ? JSON.parse(currentMap.image_bounds) : imageBounds}
                    allowEditingWithoutTag={showForm}
                    showTags={showTags}
                    onRemovePoint={handleRemovePoint}
                    visibleCategories={visibleCategories}
                    cropBounds={currentMap?.crop_bounds ? JSON.parse(currentMap.crop_bounds) : null}
                    currentMapId={currentMap?.id || null}
                    parentMapId={currentMap?.parent_map_id || null}
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
                </>
              )}
            </div>
          </div>

          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRight: sidebarCollapsed ? '1px solid var(--border-color)' : 'none',
              borderRadius: sidebarCollapsed ? '0 6px 6px 0' : '0',
              cursor: 'pointer',
              fontSize: isMobile ? '0.85rem' : '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              zIndex: 10,
              position: 'relative',
              color: 'var(--text-primary)',
              fontWeight: 500
            }}
            title={sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{sidebarCollapsed ? '→' : '←'}</span>
            
            {!isMobile && (
              <span>{sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}</span>
            )}
          </button>

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
                                    ref={(el) => { tagRefs.current[tag.id] = el; }}
                                    style={{
                                      background: selectedTag?.id === tag.id ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                                      padding: '0.75rem',
                                      borderRadius: '6px',
                                      border: selectedTag?.id === tag.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                      cursor: 'pointer',
                                      opacity: tag.visible !== undefined && !(typeof tag.visible === 'boolean' ? tag.visible : tag.visible === 1) ? 0.6 : 1,
                                      transition: 'all 0.2s',
                                      boxShadow: selectedTag?.id === tag.id ? '0 0 0 2px var(--primary-color), 0 2px 4px rgba(0,0,0,0.1)' : 'none'
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
                      {/* <div className="form-group">
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
                      </div> */}
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
                          {formData.map_point ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (editing) {
                                  handleRemovePoint(editing.id);
                                } else {
                                  setFormData({ ...formData, map_point: '' });
                                }
                                setEditingMode('none');
                              }}
                              className="btn-danger"
                              style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                            >
                              Remove Point
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingMode(editingMode === 'point' ? 'none' : 'point')}
                              className={editingMode === 'point' ? 'btn-primary' : 'btn-secondary'}
                              style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                            >
                              {editingMode === 'point' ? '✓' : ''} Set Point
                            </button>
                          )}
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
                          <>
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
                            {formData.map_polygon && (
                              <button
                                type="button"
                                onClick={handleCreateMapFromArea}
                                className="btn-primary"
                                style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '0.9rem', marginBottom: '0.5rem' }}
                                title="Create a new map from the selected polygon/circle area"
                              >
                                🗺️ Create Map from Area
                              </button>
                            )}
                          </>
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
        
        {/* Footer with Legend */}
        <div style={{
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-color)',
          padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '0.75rem' : '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '1rem' : '1.5rem',
            flexWrap: 'wrap',
            flex: 1
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: isMobile ? '0.75rem' : '0.85rem',
              color: 'var(--text-primary)'
            }}>
              <div style={{
                width: isMobile ? '12px' : '16px',
                height: isMobile ? '12px' : '16px',
                background: '#4a7c2a',
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                flexShrink: 0
              }}></div>
              <span>Point</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: isMobile ? '0.75rem' : '0.85rem',
              color: 'var(--text-primary)'
            }}>
              <div style={{
                width: isMobile ? '12px' : '16px',
                height: isMobile ? '12px' : '16px',
                background: '#4a7c2a',
                opacity: 0.3,
                border: '2px solid #4a7c2a',
                flexShrink: 0
              }}></div>
              <span>Area</span>
            </div>
            {editingMode !== 'none' && !isMobile && (
              <div style={{
                fontSize: '0.85rem',
                color: 'var(--primary-color)',
                fontWeight: 500,
                marginLeft: 'auto'
              }}>
                {editingMode === 'point' && 'Click on the map to set the location point'}
                {editingMode === 'polygon' && 'Click on the map to add points to the polygon'}
                {editingMode === 'circle' && 'Click to set center, move mouse to adjust radius, click again to finish'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Creation Modal */}
      {showMapForm && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setShowMapForm(false); }}>
          <div style={{
            background: 'var(--bg-primary)',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Create New Map</h3>
              <button
                onClick={() => setShowMapForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateMap}>
              <div className="form-group">
                <label>Map Name</label>
                <input
                  type="text"
                  value={mapFormData.name}
                  onChange={(e) => setMapFormData({ ...mapFormData, name: e.target.value })}
                  required
                  placeholder="e.g., Main Facility Map"
                />
              </div>
              <div className="form-group">
                <label>Map Image (.jpg, .jpeg, .png, .webp)</label>
                <input
                  id="map-image-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mapFormData.is_default}
                    onChange={(e) => setMapFormData({ ...mapFormData, is_default: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  Set as default map
                </label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Create Map
                </button>
                <button
                  type="button"
                  onClick={() => setShowMapForm(false)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationTagsManager;

