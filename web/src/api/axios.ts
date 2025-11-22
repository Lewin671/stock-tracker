import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track retry attempts
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

// Request interceptor to attach JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetryConfig;
    
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      
      // Handle rate limiting with automatic retry
      if (status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const errorData = data as any;
        const retrySeconds = errorData?.error?.retryAfter || parseInt(retryAfter || '5', 10);
        
        // Only retry once automatically
        if (!config._retry && config) {
          config._retry = true;
          config._retryCount = (config._retryCount || 0) + 1;
          
          // Wait for the specified time before retrying
          const waitTime = Math.min(retrySeconds * 1000, 10000); // Max 10 seconds
          
          console.log(`Rate limited. Retrying in ${waitTime / 1000} seconds...`);
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          return axiosInstance(config);
        }
        
        // If retry failed or already retried, return user-friendly error
        return Promise.reject({
          status,
          message: `请求过于频繁，请在 ${retrySeconds} 秒后重试`,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: retrySeconds,
        });
      }
      
      // Return formatted error
      return Promise.reject({
        status,
        message: (data as any)?.error?.message || 'An error occurred',
        code: (data as any)?.error?.code || 'UNKNOWN_ERROR',
      });
    } else if (error.request) {
      // Request made but no response received
      return Promise.reject({
        status: 0,
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      });
    } else {
      // Something else happened
      return Promise.reject({
        status: 0,
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      });
    }
  }
);

export default axiosInstance;
