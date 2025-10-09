import { apiService } from './api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  firstName: string
  lastName: string
  role: string
}

export interface AuthResponse {
  success: boolean
  data: {
    user: {
      id: string
      email: string
      username: string
      firstName: string
      lastName: string
      role: string
    }
    accessToken: string
    refreshToken: string
  }
}

export interface RefreshTokenResponse {
  success: boolean
  data: {
    accessToken: string
    refreshToken: string
  }
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiService.post<AuthResponse>('/auth/login', credentials)
    
    // Store tokens in localStorage
    if (response.success && response.data) {
      localStorage.setItem('accessToken', response.data.accessToken)
      localStorage.setItem('refreshToken', response.data.refreshToken)
    }
    
    return response
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    return apiService.post<AuthResponse>('/auth/register', data)
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await apiService.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken,
    })
    
    // Update tokens in localStorage
    if (response.success && response.data) {
      localStorage.setItem('accessToken', response.data.accessToken)
      localStorage.setItem('refreshToken', response.data.refreshToken)
    }
    
    return response
  },

  logout: async (): Promise<void> => {
    try {
      await apiService.post('/auth/logout')
    } catch (error) {
      // Even if logout fails, clear local tokens
      console.error('Logout error:', error)
    } finally {
      // Always clear tokens from localStorage
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<any> => {
    return apiService.post('/auth/change-password', {
      currentPassword,
      newPassword,
    })
  },

  checkAuth: async (): Promise<{ success: boolean; user?: any }> => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        return { success: false }
      }
      
      // Verify token with server
      const response = await apiService.get('/users/profile')
      return { success: true, user: response.data }
    } catch (error) {
      // If token is invalid, clear it
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      return { success: false }
    }
  },

  getCurrentUser: async (): Promise<any> => {
    return apiService.get('/users/profile')
  },
} 