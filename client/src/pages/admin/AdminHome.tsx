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
            <Link to="/admin/templates" className="btn-primary">Manage Templates</Link>
            <Link to="/admin/positions" className="btn-primary" style={{ marginTop: '1rem' }}>View Positions</Link>
            <Link to="/admin/scheduled" className="btn-primary" style={{ marginTop: '1rem' }}>Scheduled Posts</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminHome;

