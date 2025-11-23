import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/Dashboard.css';

const AdminNav: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  return (
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
  );
};

export default AdminNav;

