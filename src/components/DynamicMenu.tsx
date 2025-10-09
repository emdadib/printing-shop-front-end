import React from 'react'
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
    name: 'orders',
    label: 'Orders',
    path: '/orders',
    icon: 'ShoppingCart'
  },
  {
    name: 'products',
    label: 'Products',
    path: '/products',
    icon: 'Inventory'
  },
  {
    name: 'customers',
    label: 'Customers',
    path: '/customers',
    icon: 'People'
  },
  {
    name: 'inventory',
    label: 'Inventory',
    path: '/inventory',
    icon: 'Warehouse'
  },
  {
    name: 'suppliers',
    label: 'Suppliers',
    path: '/suppliers',
    icon: 'Business'
  },
  {
    name: 'purchase-orders',
    label: 'Purchase Orders',
    path: '/purchase-orders',
    icon: 'ShoppingBag'
  },
  {
    name: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: 'Assessment',
    requiresRole: ['SUPER_ADMIN', 'ADMIN', 'MANAGER']
  },
  {
    name: 'accounting',
    label: 'Accounting',
    path: '/accounting',
    icon: 'AccountBalance',
    requiresRole: ['SUPER_ADMIN', 'ADMIN', 'MANAGER']
  },
  {
    name: 'expenses',
    label: 'Expenses',
    path: '/expenses',
    icon: 'Receipt',
    requiresRole: ['SUPER_ADMIN', 'ADMIN', 'MANAGER']
  },
  {
    name: 'warranties',
    label: 'Warranties',
    path: '/warranties',
    icon: 'Security'
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
  const { canViewMenu, isSuperAdmin } = usePermissions()

  const getVisibleMenuItems = (): MenuItem[] => {
    return menuItems.filter(item => {
      // SuperAdmin can see all menus
      if (isSuperAdmin()) return true
      
      // Check if user can view this menu
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
  const { canViewMenu, isSuperAdmin } = usePermissions()

  return menuItems.filter(item => {
    if (isSuperAdmin()) return true
    return canViewMenu(item.name)
  })
}

export default DynamicMenu
