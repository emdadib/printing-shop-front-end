import React from 'react'
import { useAccessibleMenus } from '@/hooks/useAccessibleMenus'
import { usePermissions } from '@/hooks/usePermissions'

interface MenuItem {
  name: string
  label: string
  path: string
  icon: string
  children?: MenuItem[]
  requiresRole?: string[]
}

export const menuItems: MenuItem[] = [
  {
    name: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'Dashboard'
  },
  {
    name: 'attendance',
    label: 'Attendance',
    path: '/attendance',
    icon: 'AccessTime',
  },
  {
    name: 'orders',
    label: 'Orders',
    path: '/orders',
    icon: 'ShoppingCart',
    requiresRole: ['SUPER_ADMIN', 'ADMIN']
  },
  {
    name: 'products',
    label: 'Products',
    path: '/products',
    icon: 'Inventory',
    requiresRole: ['SUPER_ADMIN', 'ADMIN']
  },
  {
    name: 'customers',
    label: 'Customers',
    path: '/customers',
    icon: 'People',
    requiresRole: ['SUPER_ADMIN', 'ADMIN']
  },
  {
    name: 'inventory',
    label: 'Inventory',
    path: '/inventory',
    icon: 'Warehouse',
    requiresRole: ['SUPER_ADMIN', 'ADMIN']
  },
  {
    name: 'suppliers',
    label: 'Suppliers',
    path: '/suppliers',
    icon: 'Business',
    requiresRole: ['SUPER_ADMIN', 'ADMIN']
  },
  {
    name: 'purchase-orders',
    label: 'Purchase Orders',
    path: '/purchase-orders',
    icon: 'ShoppingBag',
    requiresRole: ['SUPER_ADMIN', 'ADMIN']
  },
  {
    name: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: 'Assessment',
    requiresRole: ['SUPER_ADMIN', 'ADMIN']
  },
  {
    name: 'accounting',
    label: 'Accounting',
    path: '/accounting',
    icon: 'AccountBalance',
    requiresRole: ['SUPER_ADMIN', 'ADMIN']
  },
  {
    name: 'expenses',
    label: 'Expenses',
    path: '/expenses',
    icon: 'Receipt',
    requiresRole: ['SUPER_ADMIN', 'ADMIN']
  },
  {
    name: 'warranties',
    label: 'Warranties',
    path: '/warranties',
    icon: 'Security',
    requiresRole: ['SUPER_ADMIN', 'ADMIN']
  },
  {
    name: 'users',
    label: 'Employee',
    path: '/users',
    icon: 'Person',
    requiresRole: ['SUPER_ADMIN', 'ADMIN']
  },
  {
    name: 'salary-management',
    label: 'Salary & Advances',
    path: '/salary-management',
    icon: 'AttachMoney',
    requiresRole: ['SUPER_ADMIN', 'ADMIN']
  },
  {
    name: 'permission-management',
    label: 'Permission',
    path: '/permission-management',
    icon: 'AdminPanelSettings',
    requiresRole: ['SUPER_ADMIN']
  },
  {
    name: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: 'Settings',
    requiresRole: ['SUPER_ADMIN', 'ADMIN']
  }
]

interface DynamicMenuProps {
  renderMenuItem: (item: MenuItem) => React.ReactNode
  className?: string
}

export const DynamicMenu: React.FC<DynamicMenuProps> = ({ 
  renderMenuItem, 
  className 
}) => {
  const { isSuperAdmin } = usePermissions()
  const { canViewMenu, loading } = useAccessibleMenus()

  const getVisibleMenuItems = (): MenuItem[] => {
    // Show loading state or empty array while fetching
    if (loading) {
      return []
    }

    return menuItems.filter(item => {
      // SuperAdmin can see all menus
      if (isSuperAdmin()) return true
      
      // Check if user can view this menu (from dynamic backend permissions)
      return canViewMenu(item.name)
    })
  }

  const visibleItems = getVisibleMenuItems()

  return (
    <div className={className}>
      {visibleItems.map(item => renderMenuItem(item))}
    </div>
  )
}

// Hook to get visible menu items
export const useVisibleMenuItems = (): MenuItem[] => {
  const { isSuperAdmin } = usePermissions()
  const { canViewMenu, loading } = useAccessibleMenus()

  if (loading) {
    return []
  }

  return menuItems.filter(item => {
    if (isSuperAdmin()) return true
    return canViewMenu(item.name)
  })
}

export default DynamicMenu
