import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminHome from './admin/AdminHome';
import Templates from './admin/Templates';
import Positions from './admin/Positions';
import ScheduledPosts from './admin/ScheduledPosts';
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

export default AdminDashboard;
