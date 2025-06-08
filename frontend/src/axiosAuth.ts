// src/axiosAuth.ts
import axios from 'axios';
import { getAuth } from 'firebase/auth';

const axiosAuth = axios.create({
  baseURL: process.env.VITE_API_BASE_URL, // your backend URL
});

// Add a request interceptor to add Firebase ID token to headers
axiosAuth.interceptors.request.use(
  async (config) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const token = await user.getIdToken();
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosAuth;
