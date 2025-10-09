import { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'

export const usePermissions = () => {
  const { user } = useSelector((state: RootState) => state.auth)

  const hasRole = useCallback((roles: string | string[]): boolean => {
    if (!user) return false
    
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  }, [user])

  const isSuperAdmin = useCallback((): boolean => {
    return hasRole('SUPER_ADMIN')
  }, [hasRole])

  const isAdmin = useCallback((): boolean => {
    return hasRole(['SUPER_ADMIN', 'ADMIN'])
  }, [hasRole])

  const isManager = useCallback((): boolean => {
    return hasRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])
  }, [hasRole])

  const isCashier = useCallback((): boolean => {
    return hasRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'])
  }, [hasRole])

  const canCreate = useCallback((resource: string): boolean => {
    if (!user) return false
    if (isSuperAdmin()) return true
    
    // Define role-based permissions for create operations
    const createPermissions: Record<string, string[]> = {
      'users': ['SUPER_ADMIN', 'ADMIN'],
      'products': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'orders': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'],
      'customers': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'],
      'inventory': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'suppliers': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'purchase-orders': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'reports': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'settings': ['SUPER_ADMIN', 'ADMIN'],
      'accounting': ['SUPER_ADMIN', 'ADMIN'],
      'warranties': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'],
    }
    
    return createPermissions[resource]?.includes(user.role) || false
  }, [user, isSuperAdmin])

  const canRead = useCallback((resource: string): boolean => {
    if (!user) return false
    if (isSuperAdmin()) return true
    
    // Define role-based permissions for read operations
    const readPermissions: Record<string, string[]> = {
      'users': ['SUPER_ADMIN', 'ADMIN'],
      'products': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'orders': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'customers': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'inventory': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'suppliers': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'purchase-orders': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'reports': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'settings': ['SUPER_ADMIN', 'ADMIN'],
      'accounting': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'warranties': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
    }
    
    return readPermissions[resource]?.includes(user.role) || false
  }, [user, isSuperAdmin])

  const canUpdate = useCallback((resource: string): boolean => {
    if (!user) return false
    if (isSuperAdmin()) return true
    
    // Define role-based permissions for update operations
    const updatePermissions: Record<string, string[]> = {
      'users': ['SUPER_ADMIN', 'ADMIN'],
      'products': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'orders': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'],
      'customers': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'],
      'inventory': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'suppliers': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'purchase-orders': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'reports': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'settings': ['SUPER_ADMIN', 'ADMIN'],
      'accounting': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'warranties': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'],
    }
    
    return updatePermissions[resource]?.includes(user.role) || false
  }, [user, isSuperAdmin])

  const canDelete = useCallback((resource: string): boolean => {
    if (!user) return false
    if (isSuperAdmin()) return true
    
    // Define role-based permissions for delete operations
    const deletePermissions: Record<string, string[]> = {
      'users': ['SUPER_ADMIN', 'ADMIN'],
      'products': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'orders': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'customers': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'inventory': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'suppliers': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'purchase-orders': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'reports': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'settings': ['SUPER_ADMIN', 'ADMIN'],
      'accounting': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'warranties': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    }
    
    return deletePermissions[resource]?.includes(user.role) || false
  }, [user, isSuperAdmin])

  const canViewMenu = useCallback((menuName: string): boolean => {
    if (!user) return false
    if (isSuperAdmin()) return true
    
    // Define role-based menu access
    const menuPermissions: Record<string, string[]> = {
      'dashboard': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'orders': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'products': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'customers': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'inventory': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'suppliers': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'purchase-orders': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'reports': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'accounting': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      'warranties': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'OPERATOR', 'STAFF'],
      'users': ['SUPER_ADMIN', 'ADMIN'],
      'permission-management': ['SUPER_ADMIN'],
      'settings': ['SUPER_ADMIN', 'ADMIN'],
    }
    
    return menuPermissions[menuName]?.includes(user.role) || false
  }, [user, isSuperAdmin])

  return {
    user,
    hasRole,
    isSuperAdmin,
    isAdmin,
    isManager,
    isCashier,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canViewMenu,
  }
}
