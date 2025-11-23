import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
let authToken: string | null = null;

export const authAPI = {
  setToken: (token: string | null) => {
    authToken = token;
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
};

export const adminAPI = {
  getTemplates: () => api.get('/admin/templates'),
  createTemplate: (data: any) => api.post('/admin/templates', data),
  updateTemplate: (id: number, data: any) => api.put(`/admin/templates/${id}`, data),
  deleteTemplate: (id: number) => api.delete(`/admin/templates/${id}`),
  getPositions: () => api.get('/admin/positions'),
  getPosition: (id: number) => api.get(`/admin/positions/${id}`),
  createPosition: (data: any) => api.post('/admin/positions', data),
  notifyVolunteers: (id: number) => api.post(`/admin/positions/${id}/notify`),
  getScheduledPosts: () => api.get('/admin/scheduled-posts'),
  createScheduledPost: (data: any) => api.post('/admin/scheduled-posts', data),
  toggleScheduledPost: (id: number) => api.patch(`/admin/scheduled-posts/${id}/toggle`),
  // Location Tags
  getLocationTags: () => api.get('/admin/location-tags'),
  createLocationTag: (data: any) => api.post('/admin/location-tags', data),
  updateLocationTag: (id: number, data: any) => api.put(`/admin/location-tags/${id}`, data),
  deleteLocationTag: (id: number) => api.delete(`/admin/location-tags/${id}`),
  // Requirement Tags
  getRequirementTags: () => api.get('/admin/requirement-tags'),
  createRequirementTag: (data: any) => api.post('/admin/requirement-tags', data),
  updateRequirementTag: (id: number, data: any) => api.put(`/admin/requirement-tags/${id}`, data),
  deleteRequirementTag: (id: number) => api.delete(`/admin/requirement-tags/${id}`),
};

export const volunteerAPI = {
  getPositions: () => api.get('/volunteer/positions'),
  getSignups: () => api.get('/volunteer/signups'),
  signup: (positionId: number) => api.post('/volunteer/signups', { position_id: positionId }),
  cancelSignup: (id: number) => api.delete(`/volunteer/signups/${id}`),
  getProfile: () => api.get('/volunteer/profile'),
  updatePreferences: (preference: string) => api.patch('/volunteer/profile/preferences', { notification_preference: preference }),
};

export default api;

