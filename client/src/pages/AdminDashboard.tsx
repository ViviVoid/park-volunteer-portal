import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminHome from './admin/AdminHome';
import VolunteerManagement from './admin/VolunteerManagement';
import OrganizationCommunications from './admin/OrganizationCommunications';
import InteractiveMapPage from './admin/InteractiveMap';
import './Dashboard.css';

const AdminDashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <Routes>
        <Route path="/" element={<AdminHome />} />
        <Route path="/volunteer-management" element={<VolunteerManagement />} />
        <Route path="/communications" element={<OrganizationCommunications />} />
        <Route path="/interactive-map" element={<InteractiveMapPage />} />
      </Routes>
    </div>
  );
};

export default AdminDashboard;
