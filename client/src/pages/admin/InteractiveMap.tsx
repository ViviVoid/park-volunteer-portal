import React from 'react';
import { useNavigate } from 'react-router-dom';
import LocationTagsManager from '../../components/LocationTagsManager';
import '../Dashboard.css';

const InteractiveMapPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <LocationTagsManager
        onClose={() => navigate('/admin')} // Navigate back to admin home
        locationTags={[]} // Will be loaded internally
        onTagsUpdate={() => {}} // No-op since updates are handled internally
      />
    </div>
  );
};

export default InteractiveMapPage;

