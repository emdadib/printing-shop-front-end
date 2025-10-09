import React from 'react'
import { usePermissions } from '@/hooks/usePermissions'

interface PermissionGateProps {
  children: React.ReactNode
  resource?: string
  action?: 'create' | 'read' | 'update' | 'delete'
  menu?: string
  roles?: string | string[]
  fallback?: React.ReactNode
  requireAll?: boolean // If true, user must have ALL specified permissions
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  resource,
  action,
  menu,
  roles,
  fallback = null,
  requireAll = false
}) => {
  const { 
    hasRole, 
    canCreate, 
    canRead, 
    canUpdate, 
    canDelete, 
    canViewMenu 
  } = usePermissions()

  // Check role-based access
  if (roles) {
    const hasRequiredRole = hasRole(roles)
    if (!hasRequiredRole) {
      return <>{fallback}</>
    }
  }

  // Check menu access
  if (menu) {
    const canView = canViewMenu(menu)
    if (!canView) {
      return <>{fallback}</>
    }
  }

  // Check resource-based permissions
  if (resource && action) {
    let hasPermission = false

    switch (action) {
      case 'create':
        hasPermission = canCreate(resource)
        break
      case 'read':
        hasPermission = canRead(resource)
        break
      case 'update':
        hasPermission = canUpdate(resource)
        break
      case 'delete':
        hasPermission = canDelete(resource)
        break
      default:
        hasPermission = false
    }

    if (!hasPermission) {
      return <>{fallback}</>
    }
  }

  // If requireAll is true and we have multiple conditions, check all
  if (requireAll) {
    const conditions = []
    
    if (roles) conditions.push(hasRole(roles))
    if (menu) conditions.push(canViewMenu(menu))
    if (resource && action) {
      switch (action) {
        case 'create':
          conditions.push(canCreate(resource))
          break
        case 'read':
          conditions.push(canRead(resource))
          break
        case 'update':
          conditions.push(canUpdate(resource))
          break
        case 'delete':
          conditions.push(canDelete(resource))
          break
      }
    }

    if (conditions.length > 0 && !conditions.every(Boolean)) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

// Convenience components for common use cases
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <PermissionGate roles={['SUPER_ADMIN', 'ADMIN']} fallback={fallback}>
    {children}
  </PermissionGate>
)

export const ManagerOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <PermissionGate roles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']} fallback={fallback}>
    {children}
  </PermissionGate>
)

export const SuperAdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <PermissionGate roles="SUPER_ADMIN" fallback={fallback}>
    {children}
  </PermissionGate>
)

export const CanCreate: React.FC<{ 
  resource: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode 
}> = ({ resource, children, fallback }) => (
  <PermissionGate resource={resource} action="create" fallback={fallback}>
    {children}
  </PermissionGate>
)

export const CanRead: React.FC<{ 
  resource: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode 
}> = ({ resource, children, fallback }) => (
  <PermissionGate resource={resource} action="read" fallback={fallback}>
    {children}
  </PermissionGate>
)

export const CanUpdate: React.FC<{ 
  resource: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode 
}> = ({ resource, children, fallback }) => (
  <PermissionGate resource={resource} action="update" fallback={fallback}>
    {children}
  </PermissionGate>
)

export const CanDelete: React.FC<{ 
  resource: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode 
}> = ({ resource, children, fallback }) => (
  <PermissionGate resource={resource} action="delete" fallback={fallback}>
    {children}
  </PermissionGate>
)
