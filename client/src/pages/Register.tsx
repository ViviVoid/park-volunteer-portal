import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import './Auth.css';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    notification_preference: 'email',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData);
      showToast('Registration successful! Welcome!', 'success');
      setTimeout(() => {
        navigate('/volunteer');
      }, 500);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
      <div className="auth-card">
        <h1>Park Volunteer Portal</h1>
        <h2>Register as Volunteer</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
              placeholder="Your full name"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
              placeholder="your@email.com"
            />
          </div>
          <div className="form-group">
            <label>Phone (optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={loading}
              placeholder="+1234567890"
            />
          </div>
          <div className="form-group">
            <label>Notification Preference</label>
            <select
              value={formData.notification_preference}
              onChange={(e) => setFormData({ ...formData, notification_preference: e.target.value })}
              disabled={loading}
            >
              <option value="email">Email</option>
              <option value="phone">Phone (SMS)</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              disabled={loading}
              placeholder="At least 6 characters"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
        <p className="auth-link" style={{ marginTop: '0.5rem' }}>
          <Link to="/">← Back to Map</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

