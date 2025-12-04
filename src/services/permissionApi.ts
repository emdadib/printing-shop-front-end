import { apiService } from './api'

export interface Permission {
  id: string
  name: string
  description: string
  resource: string
  action: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Menu {
  id: string
  name: string
  label: string
  path: string | null
  icon: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
  requiresRole: string | null
  createdAt: string
  updatedAt: string
  children?: Menu[]
}

export interface UserPermission {
  id: string
  userId: string
  permissionId: string
  granted: boolean
  grantedBy: string | null
  grantedAt: string
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  permission: Permission
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
}

export interface UserMenuPermission {
  id: string
  userId: string
  menuId: string
  canView: boolean
  grantedBy: string | null
  grantedAt: string
  createdAt: string
  updatedAt: string
  menu: Menu
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
}

export interface PermissionsResponse {
  success: boolean
  data: Permission[]
}

export interface MenusResponse {
  success: boolean
  data: Menu[]
}

export interface UserPermissionsResponse {
  success: boolean
  data: UserPermission[]
}

export interface UserMenuPermissionsResponse {
  success: boolean
  data: UserMenuPermission[]
}

export interface AccessibleMenusResponse {
  success: boolean
  data: Menu[]
}

export interface GrantPermissionRequest {
  userId: string
  permissionId: string
  expiresAt?: string
}

export interface GrantMenuPermissionRequest {
  userId: string
  menuId: string
}

export interface PermissionResponse {
  success: boolean
  data: UserPermission | UserMenuPermission
  message?: string
}

export interface MessageResponse {
  success: boolean
  message: string
}

export const permissionApi = {
  // Get all permissions
  getAllPermissions: async (): Promise<PermissionsResponse> => {
    return apiService.get<PermissionsResponse>('/permissions/permissions')
  },

  // Get user permissions
  getUserPermissions: async (userId: string): Promise<UserPermissionsResponse> => {
    return apiService.get<UserPermissionsResponse>(`/permissions/permissions/user/${userId}`)
  },

  // Grant permission to user
  grantPermission: async (data: GrantPermissionRequest): Promise<PermissionResponse> => {
    return apiService.post<PermissionResponse>('/permissions/permissions/grant', data)
  },

  // Revoke permission from user
  revokePermission: async (data: { userId: string; permissionId: string }): Promise<MessageResponse> => {
    return apiService.post<MessageResponse>('/permissions/permissions/revoke', data)
  },

  // Get all menus
  getAllMenus: async (): Promise<MenusResponse> => {
    return apiService.get<MenusResponse>('/permissions/menus')
  },

  // Get user menu permissions
  getUserMenuPermissions: async (userId: string): Promise<UserMenuPermissionsResponse> => {
    return apiService.get<UserMenuPermissionsResponse>(`/permissions/menus/user/${userId}`)
  },

  // Get user accessible menus
  getUserAccessibleMenus: async (userId: string): Promise<AccessibleMenusResponse> => {
    return apiService.get<AccessibleMenusResponse>(`/permissions/menus/accessible/${userId}`)
  },

  // Grant menu permission to user
  grantMenuPermission: async (data: GrantMenuPermissionRequest): Promise<PermissionResponse> => {
    return apiService.post<PermissionResponse>('/permissions/menus/grant', data)
  },

  // Revoke menu permission from user
  revokeMenuPermission: async (data: { userId: string; menuId: string }): Promise<MessageResponse> => {
    return apiService.post<MessageResponse>('/permissions/menus/revoke', data)
  },
}

