import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, ImageOverlay, Marker, Polygon, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './InteractiveMap.css';

// Fix for default marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapPoint {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
}

interface LocationTag {
  id: number;
  name: string;
  description?: string;
  map_point?: string; // JSON string of MapPoint
  map_polygon?: string; // JSON string of MapPoint[]
  category?: string;
  visible?: number | boolean; // 1/0 or true/false
  color?: string; // Hex color code
}

interface InteractiveMapProps {
  locationTags: LocationTag[];
  selectedTag?: LocationTag | null;
  onTagSelect?: (tag: LocationTag | null) => void;
  onPointChange?: (tagId: number, point: MapPoint | null) => void;
  onPolygonChange?: (tagId: number, polygon: MapPoint[] | null) => void;
  editingMode?: 'point' | 'polygon' | 'circle' | 'none';
  mapImageUrl?: string;
  imageBounds?: [[number, number], [number, number]]; // [[south, west], [north, east]]
  allowEditingWithoutTag?: boolean;
  showTags?: boolean;
  onRemovePoint?: (tagId: number) => void;
  visibleCategories?: Set<string>;
}

// Component to fit map bounds when ready
const MapBoundsFitter: React.FC<{
  bounds: [[number, number], [number, number]];
  mapReady: boolean;
}> = ({ bounds, mapReady }) => {
  const map = useMap();
  const hasFittedRef = useRef(false);
  
  useEffect(() => {
    if (map && bounds && mapReady && !hasFittedRef.current) {
      // Convert bounds to Leaflet LatLngBounds
      const [[south, west], [north, east]] = bounds;
      const leafletBounds = L.latLngBounds(
        L.latLng(south, west),
        L.latLng(north, east)
      );
      
      // Fit the map to the bounds with padding
      map.fitBounds(leafletBounds, {
        padding: [20, 20], // Add some padding around the edges
        maxZoom: 5 // Limit max zoom to prevent over-zooming
      });
      
      hasFittedRef.current = true;
    }
  }, [map, bounds, mapReady]);
  
  // Reset when bounds change significantly (e.g., image loads)
  useEffect(() => {
    hasFittedRef.current = false;
  }, [bounds]);
  
  return null;
};

// Component to handle map interactions
const MapInteractionHandler: React.FC<{
  editingMode: 'point' | 'polygon' | 'circle' | 'none';
  selectedTag: LocationTag | null;
  onPointChange?: (tagId: number, point: MapPoint | null) => void;
  onPolygonChange?: (tagId: number, polygon: MapPoint[] | null) => void;
  imageBounds: [[number, number], [number, number]];
  polygonPoints: L.LatLng[];
  setPolygonPoints: React.Dispatch<React.SetStateAction<L.LatLng[]>>;
  allowEditingWithoutTag?: boolean;
  locationTags: LocationTag[];
  circleCenter: L.LatLng | null;
  setCircleCenter: React.Dispatch<React.SetStateAction<L.LatLng | null>>;
  circleRadius: number;
  setCircleRadius: React.Dispatch<React.SetStateAction<number>>;
}> = ({ editingMode, selectedTag, onPointChange, onPolygonChange, imageBounds, polygonPoints, setPolygonPoints, allowEditingWithoutTag = false, locationTags, circleCenter, setCircleCenter, circleRadius, setCircleRadius }) => {
  const map = useMap();
  
  // Check if a point is inside any polygon
  const isPointInPolygon = (point: L.LatLng, polygons: LocationTag[]): boolean => {
    for (const tag of polygons) {
      if (!tag.map_polygon) continue;
      try {
        const polygon: MapPoint[] = JSON.parse(tag.map_polygon);
        if (polygon.length < 3) continue;
        
        const polygonLatLngs = polygon.map(p => normalizedToLatLng(p, imageBounds));
        let inside = false;
        for (let i = 0, j = polygonLatLngs.length - 1; i < polygonLatLngs.length; j = i++) {
          const xi = polygonLatLngs[i].lng, yi = polygonLatLngs[i].lat;
          const xj = polygonLatLngs[j].lng, yj = polygonLatLngs[j].lat;
          
          const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
            (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        if (inside) return true;
      } catch (e) {
        continue;
      }
    }
    return false;
  };

  useMapEvents({
    click: (e) => {
      if (editingMode === 'none') return;
      
      // Allow editing if we have a selectedTag OR if editing is allowed without a tag (for new tags)
      if (!selectedTag && !allowEditingWithoutTag) return;

      if (editingMode === 'point') {
        // Check if point would overlap with any polygon
        const otherTags = locationTags.filter(t => t.id !== selectedTag?.id && t.map_polygon);
        if (isPointInPolygon(e.latlng, otherTags)) {
          alert('Cannot place point inside an existing polygon area. Please choose a different location.');
          return;
        }
        const point = latLngToNormalized(e.latlng, imageBounds);
        const tagId = selectedTag?.id || -1;
        onPointChange?.(tagId, point);
      } else if (editingMode === 'polygon') {
        setPolygonPoints(prev => [...prev, e.latlng]);
      } else if (editingMode === 'circle') {
        if (!circleCenter) {
          // First click: set center
          setCircleCenter(e.latlng);
          setCircleRadius(20); // Default radius (small initial circle)
        } else {
          // Second click: finish circle and save
          const currentCenter = circleCenter;
          const currentRadius = circleRadius;
          
          // Create polygon approximation of circle (32 points)
          const points: L.LatLng[] = [];
          const numPoints = 32;
          for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * 2 * Math.PI;
            const lat = currentCenter.lat + currentRadius * Math.cos(angle);
            const lng = currentCenter.lng + currentRadius * Math.sin(angle);
            points.push(L.latLng(lat, lng));
          }
          const normalizedPolygon = points.map(p => latLngToNormalized(p, imageBounds));
          const tagId = selectedTag?.id || -1;
          onPolygonChange?.(tagId, normalizedPolygon);
          
          // Reset for next circle
          setCircleCenter(null);
          setCircleRadius(0);
        }
      }
    },
    mousemove: (e) => {
      if (editingMode === 'circle' && circleCenter) {
        // Calculate distance in simple coordinate system (not geographic)
        const dx = e.latlng.lng - circleCenter.lng;
        const dy = e.latlng.lat - circleCenter.lat;
        const distance = Math.sqrt(dx * dx + dy * dy);
        setCircleRadius(distance);
      }
    },
  });

  return null;
};

// Component to render editing polygon
const EditingPolygon: React.FC<{
  positions: L.LatLng[];
}> = ({ positions }) => {
  if (positions.length === 0) return null;
  
  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: '#ff6b6b',
        fillColor: '#ff6b6b',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5',
      }}
    />
  );
};

// Component to render editing circle
const EditingCircle: React.FC<{
  center: L.LatLng | null;
  radius: number;
}> = ({ center, radius }) => {
  if (!center || radius <= 0) return null;
  
  return (
    <Circle
      center={center}
      radius={radius}
      pathOptions={{
        color: '#ff6b6b',
        fillColor: '#ff6b6b',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5',
      }}
    />
  );
};

// Convert normalized coordinates (0-1) to LatLng
function normalizedToLatLng(point: MapPoint, bounds: [[number, number], [number, number]]): L.LatLng {
  const [[south, west], [north, east]] = bounds;
  const lat = south + (north - south) * (1 - point.y); // Invert y for image coordinates
  const lng = west + (east - west) * point.x;
  return L.latLng(lat, lng);
}

// Convert LatLng to normalized coordinates (0-1)
function latLngToNormalized(latlng: L.LatLng, bounds: [[number, number], [number, number]]): MapPoint {
  const [[south, west], [north, east]] = bounds;
  const x = (latlng.lng - west) / (east - west);
  const y = 1 - (latlng.lat - south) / (north - south); // Invert y for image coordinates
  return { x, y };
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  locationTags,
  selectedTag,
  onTagSelect,
  onPointChange,
  onPolygonChange,
  editingMode = 'none',
  mapImageUrl = '/domes-facility-map.webp',
  imageBounds = [[0, 0], [1000, 1000]], // Default bounds, should match image aspect ratio
  allowEditingWithoutTag = false,
  showTags = true,
  onRemovePoint,
  visibleCategories,
}) => {
  const [mapReady, setMapReady] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<L.LatLng[]>([]);
  const [circleCenter, setCircleCenter] = useState<L.LatLng | null>(null);
  const [circleRadius, setCircleRadius] = useState<number>(0);

  // Load existing polygon when entering polygon editing mode
  useEffect(() => {
    if (editingMode === 'polygon' && selectedTag?.map_polygon) {
      try {
        const polygon: MapPoint[] = JSON.parse(selectedTag.map_polygon);
        const latlngs = polygon.map(p => normalizedToLatLng(p, imageBounds));
        setPolygonPoints(latlngs);
      } catch (e) {
        setPolygonPoints([]);
      }
    } else if (editingMode !== 'polygon') {
      setPolygonPoints([]);
    }
  }, [editingMode, selectedTag, imageBounds]);

  // Reset circle when mode changes
  useEffect(() => {
    if (editingMode !== 'circle') {
      setCircleCenter(null);
      setCircleRadius(0);
    }
  }, [editingMode]);

  // Save polygon changes
  useEffect(() => {
    if (editingMode === 'polygon' && polygonPoints.length > 0) {
      const normalizedPolygon = polygonPoints.map(p => latLngToNormalized(p, imageBounds));
      const tagId = selectedTag?.id || -1; // Use -1 for new tags
      onPolygonChange?.(tagId, normalizedPolygon);
    }
  }, [polygonPoints, editingMode, selectedTag, imageBounds, onPolygonChange]);


  // Calculate center based on image bounds (for initial render)
  const center: [number, number] = [
    (imageBounds[0][0] + imageBounds[1][0]) / 2,
    (imageBounds[0][1] + imageBounds[1][1]) / 2,
  ];

  return (
    <div className="interactive-map-container" style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={0}
        minZoom={-2}
        maxZoom={5}
        style={{ height: '100%', width: '100%' }}
        crs={L.CRS.Simple}
        whenReady={() => setMapReady(true)}
      >
        <ImageOverlay
          url={mapImageUrl}
          bounds={imageBounds}
          eventHandlers={{
            error: () => {
              console.warn('Map image failed to load. Please ensure the image is placed in /public/mitchell-park-domes-map.jpg');
            }
          }}
        />
        
        {mapReady && (
          <>
            <MapBoundsFitter bounds={imageBounds} mapReady={mapReady} />
            <MapInteractionHandler
            editingMode={editingMode}
            selectedTag={selectedTag || null}
            onPointChange={onPointChange}
            onPolygonChange={onPolygonChange}
            imageBounds={imageBounds}
            polygonPoints={polygonPoints}
            setPolygonPoints={setPolygonPoints}
            allowEditingWithoutTag={allowEditingWithoutTag}
            locationTags={locationTags}
            circleCenter={circleCenter}
            setCircleCenter={setCircleCenter}
            circleRadius={circleRadius}
            setCircleRadius={setCircleRadius}
          />
          </>
        )}

        {editingMode === 'polygon' && (
          <EditingPolygon positions={polygonPoints} />
        )}

        {editingMode === 'circle' && (
          <EditingCircle center={circleCenter} radius={circleRadius} />
        )}

        {showTags && locationTags
          .filter((tag) => {
            // Filter by visibility
            const isVisible = tag.visible !== undefined 
              ? (typeof tag.visible === 'boolean' ? tag.visible : tag.visible === 1)
              : true;
            if (!isVisible) return false;
            
            // Filter by category if visibleCategories is set
            if (visibleCategories !== undefined && tag.category) {
              return visibleCategories.has(tag.category);
            }
            return true;
          })
          .map((tag) => {
          let markerPosition: L.LatLng | null = null;
          let polygonPositions: L.LatLng[] = [];

          if (tag.map_point) {
            try {
              const point: MapPoint = JSON.parse(tag.map_point);
              markerPosition = normalizedToLatLng(point, imageBounds);
            } catch (e) {
              console.error('Error parsing map_point for tag', tag.id, e);
            }
          }

          if (tag.map_polygon) {
            try {
              const polygon: MapPoint[] = JSON.parse(tag.map_polygon);
              polygonPositions = polygon.map(p => normalizedToLatLng(p, imageBounds));
            } catch (e) {
              console.error('Error parsing map_polygon for tag', tag.id, e);
            }
          }

          const isSelected = selectedTag?.id === tag.id;
          const tagColor = tag.color || '#4a7c2a'; // Default green color
          const borderColor = isSelected ? '#2d5016' : tagColor;
          const fillColor = tagColor;

          // Create custom icon with color
          const createColoredIcon = (color: string) => {
            return L.divIcon({
              className: 'custom-marker',
              html: `<div style="
                width: 20px;
                height: 20px;
                background-color: ${color};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });
          };

          return (
            <React.Fragment key={tag.id}>
              {markerPosition && (
                <Marker
                  position={markerPosition}
                  icon={createColoredIcon(tagColor)}
                  eventHandlers={{
                    click: () => onTagSelect?.(tag),
                  }}
                >
                  <Popup>
                    <div>
                      <strong>{tag.name}</strong>
                      {tag.description && <p>{tag.description}</p>}
                      {/* {onRemovePoint && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Remove point location for "${tag.name}"?`)) {
                              onRemovePoint(tag.id);
                            }
                          }}
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          Remove Point
                        </button>
                      )} */}
                    </div>
                  </Popup>
                </Marker>
              )}
              {polygonPositions.length > 0 && (
                <Polygon
                  positions={polygonPositions}
                  pathOptions={{
                    color: borderColor,
                    fillColor: fillColor,
                    fillOpacity: 0.3,
                    weight: isSelected ? 3 : 2,
                  }}
                  eventHandlers={{
                    click: () => onTagSelect?.(tag),
                  }}
                >
                  <Popup>
                    <div>
                      <strong>{tag.name}</strong>
                      {tag.description && <p>{tag.description}</p>}
                    </div>
                  </Popup>
                </Polygon>
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default InteractiveMap;
export type { LocationTag, MapPoint };

