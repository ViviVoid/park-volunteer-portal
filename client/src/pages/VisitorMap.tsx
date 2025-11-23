import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InteractiveMap, { LocationTag } from '../components/InteractiveMap';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import './VisitorMap.css';

const VisitorMap: React.FC = () => {
  const [maps, setMaps] = useState<any[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [currentMap, setCurrentMap] = useState<any>(null);
  const [locationTags, setLocationTags] = useState<LocationTag[]>([]);
  const [selectedTag, setSelectedTag] = useState<LocationTag | null>(null);
  const [imageBounds, setImageBounds] = useState<[[number, number], [number, number]]>([[0, 0], [1000, 1000]]);
  const { toasts, showToast, removeToast } = useToast();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    loadMaps();
  }, []);

  useEffect(() => {
    if (selectedMapId !== null) {
      loadTagsForMap(selectedMapId);
    } else {
      setLocationTags([]);
    }
  }, [selectedMapId]);

  useEffect(() => {
    if (currentMap && currentMap.image_url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const height = img.naturalHeight;
        const width = img.naturalWidth;
        setImageBounds([[0, 0], [height, width]]);
      };
      img.onerror = (e) => {
        console.warn('Failed to load map image:', currentMap.image_url, e);
      };
      const imageUrl = currentMap.image_url.startsWith('http') 
        ? currentMap.image_url 
        : `${API_URL}${currentMap.image_url}`;
      img.src = imageUrl;
    }
  }, [currentMap, API_URL]);

  const loadMaps = async () => {
    try {
      const response = await fetch(`${API_URL}/api/public/maps`);
      if (!response.ok) {
        throw new Error('Failed to load maps');
      }
      const mapsData = await response.json();
      setMaps(mapsData);
      
      // Set default map or first map
      const defaultMap = mapsData.find((m: any) => m.is_default === 1) || mapsData[0];
      if (defaultMap) {
        setSelectedMapId(defaultMap.id);
        setCurrentMap(defaultMap);
      } else {
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
      const response = await fetch(`${API_URL}/api/public/maps/${mapId}/location-tags`);
      if (!response.ok) {
        throw new Error('Failed to load location tags');
      }
      const tags = await response.json();
      setLocationTags(tags);
    } catch (error: any) {
      console.error('Failed to load location tags:', error);
      showToast('Failed to load location tags', 'error');
      setLocationTags([]);
    }
  };

  const handleMapChange = (mapId: number | null) => {
    setSelectedMapId(mapId);
    const map = maps.find(m => m.id === mapId);
    setCurrentMap(map || null);
    setSelectedTag(null);
  };

  const mapImageUrl = currentMap?.image_url 
    ? (currentMap.image_url.startsWith('http') 
        ? currentMap.image_url 
        : `${API_URL}${currentMap.image_url}`)
    : '';

  return (
    <div className="visitor-map-container">
      <header className="visitor-map-header">
        <div className="visitor-map-header-content">
          <h1>Park Map</h1>
          <div className="visitor-map-actions">
            {maps.length > 1 && (
              <select
                value={selectedMapId || ''}
                onChange={(e) => handleMapChange(e.target.value ? parseInt(e.target.value) : null)}
                className="visitor-map-selector"
              >
                {maps.map((map) => (
                  <option key={map.id} value={map.id}>
                    {map.name}
                  </option>
                ))}
              </select>
            )}
            <Link to="/login" className="visitor-map-login-link">
              Login
            </Link>
            <Link to="/register" className="visitor-map-register-link">
              Register
            </Link>
          </div>
        </div>
      </header>

      <div className="visitor-map-content">
        {currentMap ? (
          <div className="visitor-map-wrapper">
            <InteractiveMap
              locationTags={locationTags}
              selectedTag={selectedTag}
              onTagSelect={setSelectedTag}
              editingMode="none"
              mapImageUrl={mapImageUrl}
              imageBounds={imageBounds}
              showTags={true}
            />
            {selectedTag && (
              <div className="visitor-map-sidebar">
                <div className="visitor-map-tag-details">
                  <h2>{selectedTag.name}</h2>
                  {selectedTag.description && (
                    <p className="visitor-map-tag-description">{selectedTag.description}</p>
                  )}
                  {selectedTag.category && (
                    <span className="visitor-map-tag-category">{selectedTag.category}</span>
                  )}
                  <button
                    className="visitor-map-close-button"
                    onClick={() => setSelectedTag(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="visitor-map-empty">
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗺️</div>
              <p>No public maps available</p>
            </div>
          </div>
        )}
      </div>

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default VisitorMap;

