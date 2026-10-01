import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAccessibleMenus } from '@/hooks/useAccessibleMenus'
import { usePermissions } from '@/hooks/usePermissions'
import { usePhotocopySetting } from '@/hooks/usePhotocopySetting'
import {
  navigation,
  filterNavigation,
  findNavItem,
  getAllNavItems,
  getPageTitle,
  type NavGroup,
  type NavItem,
  type NavMatch,
} from '@/config/navigation'

export interface UseNavigationResult {
  /** Groups the current user may see, with hidden items removed. */
  groups: NavGroup[]
  /** Flat list of visible items. */
  items: NavItem[]
  /** The item that matches the current URL (may be hidden from the menu). */
  current: NavMatch | undefined
  /** Title for the current page, or undefined if unknown. */
  pageTitle: string | undefined
  /** True while the backend menu permissions are still loading. */
  loading: boolean
  isVisible: (key: string) => boolean
  getItem: (key: string) => NavItem | undefined
}

/**
 * Grouped navigation filtered by the user's backend menu permissions and the
 * photocopy setting. Super admins see everything.
 */
export const useNavigation = (): UseNavigationResult => {
  const location = useLocation()
  const { isSuperAdmin } = usePermissions()
  const { accessibleMenus, canViewMenu, loading } = useAccessibleMenus()
  const { isEnabled: photocopyEnabled } = usePhotocopySetting()

  const superAdmin = isSuperAdmin()

  const groups = useMemo(() => {
    if (loading) return []
    return filterNavigation(navigation, {
      canView: menuName => superAdmin || canViewMenu(menuName),
      photocopyEnabled,
    })
    // `canViewMenu` is recreated each render; `accessibleMenus` is the data it reads.
  }, [loading, superAdmin, accessibleMenus, photocopyEnabled])

  const items = useMemo(() => getAllNavItems(groups), [groups])

  const current = useMemo(() => findNavItem(location.pathname), [location.pathname])
  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname])

  const isVisible = (key: string) => items.some(item => item.key === key)
  const getItem = (key: string) => items.find(item => item.key === key)

  return { groups, items, current, pageTitle, loading, isVisible, getItem }
}
