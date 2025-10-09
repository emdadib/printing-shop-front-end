import { apiService } from './api'

export interface User {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'OPERATOR' | 'STAFF'
  isActive: boolean
  lastLogin?: string
  createdAt: string
  updatedAt?: string
}

export interface CreateUserData {
  email: string
  username: string
  firstName: string
  lastName: string
  password: string
  role: User['role']
  isActive?: boolean
}

export interface UpdateUserData {
  email?: string
  username?: string
  firstName?: string
  lastName?: string
  role?: User['role']
  isActive?: boolean
}

export interface UsersResponse {
  success: boolean
  data: User[]
}

export interface UserResponse {
  success: boolean
  data: User
}

export interface MessageResponse {
  success: boolean
  message: string
}

export const userApi = {
  // Get all users
  getAllUsers: async (params?: {
    page?: number
    limit?: number
    role?: string
  }): Promise<UsersResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.role) queryParams.append('role', params.role)
    
    const url = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiService.get<UsersResponse>(url)
  },

  // Get user by ID
  getUserById: async (id: string): Promise<UserResponse> => {
    return apiService.get<UserResponse>(`/users/${id}`)
  },

  // Create new user
  createUser: async (userData: CreateUserData): Promise<UserResponse> => {
    return apiService.post<UserResponse>('/users', userData)
  },

  // Update user
  updateUser: async (id: string, userData: UpdateUserData): Promise<UserResponse> => {
    return apiService.put<UserResponse>(`/users/${id}`, userData)
  },

  // Delete user
  deleteUser: async (id: string): Promise<MessageResponse> => {
    return apiService.delete<MessageResponse>(`/users/${id}`)
  },

  // Get current user profile
  getCurrentUser: async (): Promise<UserResponse> => {
    return apiService.get<UserResponse>('/users/profile')
  },

  // Update current user profile
  updateCurrentUser: async (userData: {
    email?: string
    username?: string
    firstName?: string
    lastName?: string
  }): Promise<UserResponse> => {
    return apiService.put<UserResponse>('/users/profile', userData)
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<MessageResponse> => {
    return apiService.post<MessageResponse>('/auth/change-password', {
      currentPassword,
      newPassword,
    })
  },
}
