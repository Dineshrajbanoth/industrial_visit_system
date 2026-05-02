import axios from 'axios';

const tokenKeys = ['iv_token', 'iv_admin_token', 'iv_student_token'];

function getStoredToken() {
  for (const key of tokenKeys) {
    const value = localStorage.getItem(key);
    if (value) {
      return value;
    }
  }

  return null;
}

function getDevApiBaseUrl() {
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5000/api`;
}

function resolveApiBaseUrl() {
  const fromEnv = String(import.meta.env.VITE_API_URL || '').trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window !== 'undefined') {
    if (import.meta.env.DEV) {
      return getDevApiBaseUrl();
    }

    // Vercel monorepo setup exposes backend under /_/backend.
    return `${window.location.origin}/_/backend/api`;
  }

  return 'http://localhost:5000/api';
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const authApi = {
  login: (payload) => api.post('/auth/admin/login', payload),
  adminLogin: (payload) => api.post('/auth/admin/login', payload),
  adminRegister: (payload) => api.post('/auth/admin/register', payload),
  studentLogin: (payload) => api.post('/auth/student-login', payload),
  studentRegister: (payload) => api.post('/auth/student-register', payload),
};

export const visitApi = {
  getAll: (params) => api.get('/visits', { params }),
  getStudent: (params) => api.get('/visits/student', { params }),
  getOne: (id) => api.get(`/visits/${id}`),
  create: (formData) => api.post('/visits', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/visits/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/visits/${id}`),
  analytics: (params) => api.get('/visits/analytics/overview', { params }),
  deleteImage: (id, imageUrl) => api.delete(`/visits/${id}/images`, { data: { imageUrl } }),
};

export const feedbackApi = {
  create: (payload) => api.post('/feedback', payload),
  byVisit: (visitId) => api.get(`/feedback/${visitId}`),
  delete: (id) => api.delete(`/feedback/${id}`),
};

export default api;
