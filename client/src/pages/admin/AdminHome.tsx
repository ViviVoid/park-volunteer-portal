import React from 'react';
import { Link } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import '../Dashboard.css';

const AdminHome: React.FC = () => {
  return (
    <>
      <AdminNav />
      <div className="dashboard-content">
        <h2>Admin Dashboard</h2>
        <div className="admin-stats">
          <div className="stat-card">
            <h3>Quick Actions</h3>
            <Link to="/admin/volunteer-management" className="btn-primary">Volunteer Management</Link>
            <Link to="/admin/communications" className="btn-primary" style={{ marginTop: '1rem' }}>Organization Communications</Link>
            <Link to="/admin/interactive-map" className="btn-primary" style={{ marginTop: '1rem' }}>Interactive Map</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminHome;

