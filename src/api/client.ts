import axios from 'axios';

const api = axios.create({ baseURL: '/' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      if (import.meta.env.DEV) {
        console.warn('[Auth] 401 received — clearing token and redirecting to /login');
      }
      localStorage.removeItem('jwt');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
