import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { volunteerAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import './Dashboard.css';

const VolunteerDashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <Routes>
        <Route path="/" element={<VolunteerHome />} />
        <Route path="/signups" element={<MySignups />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  );
};

const VolunteerHome: React.FC = () => {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingUp, setSigningUp] = useState<number | null>(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      const response = await volunteerAPI.getPositions();
      setPositions(response.data);
    } catch (error) {
      console.error('Failed to load positions:', error);
      showToast('Failed to load positions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (positionId: number) => {
    setSigningUp(positionId);
    try {
      await volunteerAPI.signup(positionId);
      showToast('Successfully signed up!', 'success');
      loadPositions();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to sign up', 'error');
    } finally {
      setSigningUp(null);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
      <nav className="dashboard-nav">
        <h1>Park Volunteer Portal</h1>
        <div className="nav-links">
          <Link to="/volunteer" className={isActive('/volunteer') ? 'active' : ''}>Available Positions</Link>
          <Link to="/volunteer/signups" className={isActive('/volunteer/signups') ? 'active' : ''}>My Signups</Link>
          <Link to="/volunteer/profile" className={isActive('/volunteer/profile') ? 'active' : ''}>Profile</Link>
          <span className="user-info">{user?.name}</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </nav>
      <div className="dashboard-content">
        <h2>Available Volunteer Positions</h2>
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading positions...</p>
          </div>
        ) : positions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No positions available</h3>
            <p>Check back later for new volunteer opportunities!</p>
          </div>
        ) : (
          <div className="positions-grid">
            {positions.map((position) => (
              <div key={position.id} className="position-card">
                <h3>{position.title}</h3>
                <p className="position-date">
                  {new Date(position.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} at {position.start_time}
                </p>
                {(position.location_name || position.location) && <p className="position-location">{position.location_name || position.location}</p>}
                <p className="position-description">{position.description}</p>
                {position.requirements && (
                  <p className="position-requirements">
                    <strong>Requirements:</strong> {position.requirements}
                  </p>
                )}
                {position.max_volunteers && (
                  <p className="position-volunteers">
                    {position.current_volunteers || 0} / {position.max_volunteers} volunteers
                  </p>
                )}
                {position.has_signed_up ? (
                  <button disabled className="btn-disabled">✓ Already Signed Up</button>
                ) : (
                  <button
                    onClick={() => handleSignup(position.id)}
                    className="btn-primary"
                    disabled={signingUp === position.id}
                  >
                    {signingUp === position.id ? 'Signing Up...' : 'Sign Up'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

const MySignups: React.FC = () => {
  const [signups, setSignups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadSignups();
  }, []);

  const loadSignups = async () => {
    try {
      const response = await volunteerAPI.getSignups();
      setSignups(response.data);
    } catch (error) {
      console.error('Failed to load signups:', error);
      showToast('Failed to load signups', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (signupId: number) => {
    if (!window.confirm('Are you sure you want to cancel this signup?')) return;
    setCancelling(signupId);
    try {
      await volunteerAPI.cancelSignup(signupId);
      showToast('Signup cancelled successfully', 'success');
      loadSignups();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to cancel signup', 'error');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'pending',
      confirmed: 'success',
      cancelled: 'cancelled',
      completed: 'success'
    };
    return <span className={`badge ${statusMap[status] || 'pending'}`}>{status}</span>;
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
      <nav className="dashboard-nav">
        <h1>Park Volunteer Portal</h1>
        <div className="nav-links">
          <Link to="/volunteer" className={isActive('/volunteer') ? 'active' : ''}>Available Positions</Link>
          <Link to="/volunteer/signups" className={isActive('/volunteer/signups') ? 'active' : ''}>My Signups</Link>
          <Link to="/volunteer/profile" className={isActive('/volunteer/profile') ? 'active' : ''}>Profile</Link>
          <span className="user-info">{user?.name}</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </nav>
      <div className="dashboard-content">
        <h2>My Signups</h2>
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading your signups...</p>
          </div>
        ) : signups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h3>No signups yet</h3>
            <p>Browse available positions and sign up to get started!</p>
          </div>
        ) : (
          <div className="positions-grid">
            {signups.map((signup) => (
              <div key={signup.id} className="position-card">
                <h3>{signup.title}</h3>
                <p className="position-date">
                  {new Date(signup.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} at {signup.start_time}
                </p>
                {signup.location && <p className="position-location">{signup.location}</p>}
                <p className="position-description">{signup.description}</p>
                <p className="signup-status">
                  Status: {getStatusBadge(signup.status)}
                </p>
                {signup.status === 'pending' || signup.status === 'confirmed' ? (
                  <button
                    onClick={() => handleCancel(signup.id)}
                    className="btn-danger"
                    disabled={cancelling === signup.id}
                  >
                    {cancelling === signup.id ? 'Cancelling...' : 'Cancel Signup'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [preference, setPreference] = useState('email');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await volunteerAPI.getProfile();
      setProfile(response.data);
      setPreference(response.data.notification_preference || 'email');
    } catch (error) {
      console.error('Failed to load profile:', error);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreference = async () => {
    setUpdating(true);
    try {
      await volunteerAPI.updatePreferences(preference);
      showToast('Preferences updated successfully!', 'success');
      loadProfile();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to update preferences', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
      <nav className="dashboard-nav">
        <h1>Park Volunteer Portal</h1>
        <div className="nav-links">
          <Link to="/volunteer" className={isActive('/volunteer') ? 'active' : ''}>Available Positions</Link>
          <Link to="/volunteer/signups" className={isActive('/volunteer/signups') ? 'active' : ''}>My Signups</Link>
          <Link to="/volunteer/profile" className={isActive('/volunteer/profile') ? 'active' : ''}>Profile</Link>
          <span className="user-info">{user?.name}</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </nav>
      <div className="dashboard-content">
        <h2>My Profile</h2>
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading profile...</p>
          </div>
        ) : profile && (
          <div className="profile-card">
            <p><strong>Name:</strong> {profile.name}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            {profile.phone && <p><strong>Phone:</strong> {profile.phone}</p>}
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Notification Preference</label>
              <select
                value={preference}
                onChange={(e) => setPreference(e.target.value)}
              >
                <option value="email">📧 Email</option>
                <option value="phone">📱 Phone (SMS)</option>
                <option value="both">📧📱 Both</option>
              </select>
              <button
                onClick={handleUpdatePreference}
                className="btn-primary"
                disabled={updating}
                style={{ marginTop: '1rem' }}
              >
                {updating ? 'Updating...' : 'Update Preference'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VolunteerDashboard;

