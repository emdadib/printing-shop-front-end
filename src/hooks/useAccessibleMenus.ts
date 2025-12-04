import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { permissionApi, type Menu } from '@/services/permissionApi'

/**
 * Hook to fetch and manage user's accessible menus dynamically from the backend
 * This combines role-based and permission-based menu access
 */
export const useAccessibleMenus = () => {
  const { user } = useSelector((state: RootState) => state.auth)

  const { data, isLoading, error, refetch } = useQuery<Menu[]>(
    ['accessibleMenus', user?.id],
    async () => {
      if (!user?.id) {
        return []
      }

      const response = await permissionApi.getUserAccessibleMenus(user.id)
      if (response.success && response.data) {
        return response.data
      }
      return []
    },
    {
      enabled: !!user?.id, // Only fetch if user is logged in
      staleTime: 5 * 60 * 1000, // 5 minutes - menus don't change frequently
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Retry once on failure
    }
  )

  /**
   * Check if user can view a specific menu by name
   */
  const canViewMenu = (menuName: string): boolean => {
    if (!user) return false
    if (user.role === 'SUPER_ADMIN') return true // SuperAdmin can see all menus
    
    if (!data || data.length === 0) return false

    // Check if menu exists in accessible menus
    const menuExists = (menus: Menu[]): boolean => {
      for (const menu of menus) {
        if (menu.name === menuName) return true
        if (menu.children && menu.children.length > 0) {
          if (menuExists(menu.children)) return true
        }
      }
      return false
    }

    return menuExists(data)
  }

  /**
   * Get all accessible menu names as a Set for quick lookup
   */
  const getAccessibleMenuNames = (): Set<string> => {
    const names = new Set<string>()
    
    const collectNames = (menus: Menu[]) => {
      menus.forEach(menu => {
        names.add(menu.name)
        if (menu.children && menu.children.length > 0) {
          collectNames(menu.children)
        }
      })
    }

    if (data) {
      collectNames(data)
    }

    return names
  }

  return {
    accessibleMenus: data || [],
    loading: isLoading,
    error: error ? 'Failed to load accessible menus' : null,
    canViewMenu,
    getAccessibleMenuNames,
    refetch, // Expose refetch to manually refresh menus
  }
}

