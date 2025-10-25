import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import toast from 'react-hot-toast'

// Request queue to prevent too many simultaneous requests
const requestQueue: Array<() => void> = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 5;

// Process queue function
function processQueue() {
  if (activeRequests < MAX_CONCURRENT_REQUESTS && requestQueue.length > 0) {
    const nextRequest = requestQueue.shift();
    if (nextRequest) {
      nextRequest();
    }
  }
}

// Get API URL based on environment
const getApiUrl = () => {
  // Production environment
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || 'https://sb-printers.uc.r.appspot.com/api'
  }
  // Development environment
  return import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: getApiUrl(),
  timeout: 15000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token and manage request queue
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors and refresh tokens
api.interceptors.response.use(
  (response: AxiosResponse) => {
    activeRequests--;
    processQueue();
    return response
  },
  async (error) => {
    activeRequests--;
    processQueue();
    
    const originalRequest = error.config

    // Handle 429 errors (rate limiting) with retry
    if (error.response?.status === 429 && !originalRequest._retry) {
      originalRequest._retry = true
      
      // Wait for a longer delay between 2-5 seconds before retrying
      const delay = Math.random() * 3000 + 2000
      await new Promise(resolve => setTimeout(resolve, delay))
      
      return api(originalRequest)
    }

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${getApiUrl()}/auth/refresh`, {
            refreshToken,
          })

          const { accessToken } = response.data.data
          localStorage.setItem('accessToken', accessToken)

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh token failed, redirect to login
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Handle other errors
    if (error.response?.data?.message) {
      toast.error(error.response.data.message)
    } else if (error.message) {
      toast.error(error.message)
    }

    return Promise.reject(error)
  }
)

// Generic API methods with request queuing
export const apiService = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return new Promise((resolve, reject) => {
      const makeRequest = () => {
        activeRequests++;
        api.get(url, config)
          .then((response) => resolve(response.data))
          .catch(reject);
      };

      if (activeRequests < MAX_CONCURRENT_REQUESTS) {
        makeRequest();
      } else {
        requestQueue.push(makeRequest);
      }
    });
  },

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return new Promise((resolve, reject) => {
      const makeRequest = () => {
        activeRequests++;
        api.post(url, data, config)
          .then((response) => resolve(response.data))
          .catch(reject);
      };

      if (activeRequests < MAX_CONCURRENT_REQUESTS) {
        makeRequest();
      } else {
        requestQueue.push(makeRequest);
      }
    });
  },

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return new Promise((resolve, reject) => {
      const makeRequest = () => {
        activeRequests++;
        api.put(url, data, config)
          .then((response) => resolve(response.data))
          .catch(reject);
      };

      if (activeRequests < MAX_CONCURRENT_REQUESTS) {
        makeRequest();
      } else {
        requestQueue.push(makeRequest);
      }
    });
  },

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return new Promise((resolve, reject) => {
      const makeRequest = () => {
        activeRequests++;
        api.patch(url, data, config)
          .then((response) => resolve(response.data))
          .catch(reject);
      };

      if (activeRequests < MAX_CONCURRENT_REQUESTS) {
        makeRequest();
      } else {
        requestQueue.push(makeRequest);
      }
    });
  },

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return new Promise((resolve, reject) => {
      const makeRequest = () => {
        activeRequests++;
        api.delete(url, config)
          .then((response) => resolve(response.data))
          .catch(reject);
      };

      if (activeRequests < MAX_CONCURRENT_REQUESTS) {
        makeRequest();
      } else {
        requestQueue.push(makeRequest);
      }
    });
  },
}

export default api 