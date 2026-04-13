import axios from 'axios';

const baseURL = import.meta.env.DEV ? 'http://localhost:3333' : window.location.origin;

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@KAO:token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
