import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const managerToken = localStorage.getItem('managerToken');
  const voterToken = localStorage.getItem('token');
  const token = managerToken || voterToken;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('managerToken');
      window.location.href = '/manager/login';
    }
    return Promise.reject(error);
  }
);