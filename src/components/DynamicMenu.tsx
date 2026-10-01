import React from 'react'
import { useNavigation } from '@/hooks/useNavigation'
import { getAllNavItems, type NavItem } from '@/config/navigation'

/**
 * Thin compatibility layer over the grouped navigation in `config/navigation.ts`.
 * New code should use `useNavigation()` directly.
 */

/** Flat list of every nav item, regardless of permissions. */
export const menuItems: NavItem[] = getAllNavItems()

interface DynamicMenuProps {
  renderMenuItem: (item: NavItem) => React.ReactNode
  className?: string
}

export const DynamicMenu: React.FC<DynamicMenuProps> = ({ renderMenuItem, className }) => {
  const { items } = useNavigation()
  return <div className={className}>{items.map(item => renderMenuItem(item))}</div>
}

/** Flat list of the nav items the current user may see. */
export const useVisibleMenuItems = (): NavItem[] => useNavigation().items

export default DynamicMenu
