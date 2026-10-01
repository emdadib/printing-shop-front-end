import { describe, it, expect } from 'vitest'
import {
  navigation,
  filterNavigation,
  findNavItem,
  getPageTitle,
  getAllNavItems,
  mobileNavKeys,
  quickActionKeys,
} from './navigation'

const allowAll = { canView: () => true, photocopyEnabled: true }

describe('navigation config', () => {
  it('uses unique item keys', () => {
    const keys = getAllNavItems().map(item => item.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('only references existing items from the phone bar and quick actions', () => {
    const keys = new Set(getAllNavItems().map(item => item.key))
    for (const key of [...mobileNavKeys, ...quickActionKeys]) {
      expect(keys.has(key), `missing nav item "${key}"`).toBe(true)
    }
  })

  it('keeps every gated item on a backend menu name', () => {
    for (const item of getAllNavItems()) {
      if (!item.requiresPhotocopy) {
        expect(item.menu, `${item.key} has no menu`).toBeTruthy()
      }
    }
  })
})

describe('filterNavigation', () => {
  it('shows everything when the user may view all menus', () => {
    const groups = filterNavigation(navigation, allowAll)
    expect(groups.map(group => group.key)).toEqual(navigation.map(group => group.key))
  })

  it('hides items the user cannot view and drops empty groups', () => {
    const groups = filterNavigation(navigation, {
      canView: menu => menu === 'dashboard' || menu === 'orders',
      photocopyEnabled: false,
    })
    expect(groups.map(group => group.key)).toEqual(['home', 'sales'])
    expect(groups[1].items.map(item => item.key)).toEqual(['pos', 'orders', 'due-payments'])
  })

  it('shows the photocopy item only when the service is enabled', () => {
    const on = filterNavigation(navigation, allowAll)
    const off = filterNavigation(navigation, { ...allowAll, photocopyEnabled: false })
    expect(getAllNavItems(on).some(item => item.key === 'photocopy')).toBe(true)
    expect(getAllNavItems(off).some(item => item.key === 'photocopy')).toBe(false)
  })
})

describe('findNavItem', () => {
  it('matches an exact path', () => {
    const match = findNavItem('/orders/due-amount')
    expect(match?.item.key).toBe('due-payments')
    expect(match?.group.key).toBe('sales')
  })

  it('matches a legacy alias path', () => {
    expect(findNavItem('/user-management')?.item.key).toBe('users')
    expect(findNavItem('/salary-advances')?.item.key).toBe('salary')
  })

  it('matches the longest path prefix for sub pages', () => {
    expect(findNavItem('/purchase-orders/new')?.item.key).toBe('purchase-orders')
  })

  it('returns undefined for unknown paths', () => {
    expect(findNavItem('/profile')).toBeUndefined()
    expect(findNavItem('/nope')).toBeUndefined()
  })
})

describe('getPageTitle', () => {
  it('uses the nav label when the path is in the menu', () => {
    expect(getPageTitle('/inventory')).toBe('Stock Levels')
  })

  it('knows titles for pages outside the menu', () => {
    expect(getPageTitle('/profile')).toBe('My Profile')
    expect(getPageTitle('/purchase-orders/new')).toBe('New Purchase Order')
  })

  it('is undefined for unknown paths', () => {
    expect(getPageTitle('/nope')).toBeUndefined()
  })
})
