import type { SvgIconComponent } from '@mui/icons-material'
import {
  HomeRounded,
  PointOfSaleRounded,
  ReceiptLongRounded,
  PaymentsRounded,
  PeopleRounded,
  VerifiedUserRounded,
  ContentCopyRounded,
  Inventory2Rounded,
  CategoryRounded,
  WarehouseRounded,
  StorefrontRounded,
  LocalShippingRounded,
  AccountBalanceRounded,
  ReceiptRounded,
  BarChartRounded,
  AccessTimeRounded,
  BadgeRounded,
  PaidRounded,
  SettingsRounded,
  AdminPanelSettingsRounded,
  ShoppingCartRounded,
  Inventory2Outlined,
  ShoppingBagRounded,
  SavingsRounded,
  GroupsRounded,
  TuneRounded,
} from '@mui/icons-material'

/**
 * Single source of truth for the app's navigation.
 *
 * Every item keeps the backend `menu` name it always had (dashboard, orders,
 * products, …) so the server-driven permission model keeps working unchanged.
 * Sub-pages that never had their own menu entry (POS, due payments, categories)
 * borrow their parent's menu name.
 */
export interface NavItem {
  /** Unique key, also used for bottom-nav / quick-action lookups. */
  key: string
  /** Plain-language label shown to users. */
  label: string
  path: string
  icon: SvgIconComponent
  /** Backend menu name to check with `canViewMenu`. Omit = always visible. */
  menu?: string
  /** One-line hint for dashboard tiles. */
  hint?: string
  /** Other paths that should count as this page (for titles / active state). */
  aliases?: string[]
  /** Only show when the photocopy service setting is enabled. */
  requiresPhotocopy?: boolean
  /** Page renders outside the normal Layout (full-screen). */
  fullScreen?: boolean
}

export interface NavGroup {
  key: string
  label: string
  icon: SvgIconComponent
  items: NavItem[]
}

export const navigation: NavGroup[] = [
  {
    key: 'home',
    label: 'Home',
    icon: HomeRounded,
    items: [
      {
        key: 'dashboard',
        label: 'Home',
        path: '/dashboard',
        icon: HomeRounded,
        menu: 'dashboard',
        hint: 'Today at a glance',
      },
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: ShoppingCartRounded,
    items: [
      {
        key: 'pos',
        label: 'New Sale',
        path: '/pos',
        icon: PointOfSaleRounded,
        menu: 'orders',
        hint: 'Ring up a sale at the counter',
        fullScreen: true,
      },
      {
        key: 'orders',
        label: 'Orders',
        path: '/orders',
        icon: ReceiptLongRounded,
        menu: 'orders',
        hint: 'See and update all orders',
      },
      {
        key: 'due-payments',
        label: 'Due Payments',
        path: '/orders/due-amount',
        icon: PaymentsRounded,
        menu: 'orders',
        hint: 'Collect money customers still owe',
      },
      {
        key: 'customers',
        label: 'Customers',
        path: '/customers',
        icon: PeopleRounded,
        menu: 'customers',
        hint: 'Find or add a customer',
      },
      {
        key: 'warranties',
        label: 'Warranties',
        path: '/warranties',
        icon: VerifiedUserRounded,
        menu: 'warranties',
        hint: 'Track product warranties',
      },
      {
        key: 'photocopy',
        label: 'Photocopy',
        path: '/photocopy',
        icon: ContentCopyRounded,
        hint: 'Photocopy service counter',
        requiresPhotocopy: true,
      },
    ],
  },
  {
    key: 'stock',
    label: 'Stock',
    icon: Inventory2Outlined,
    items: [
      {
        key: 'products',
        label: 'Products',
        path: '/products',
        icon: Inventory2Rounded,
        menu: 'products',
        hint: 'Items and prices you sell',
      },
      {
        key: 'categories',
        label: 'Categories',
        path: '/categories',
        icon: CategoryRounded,
        menu: 'products',
        hint: 'Group products into categories',
      },
      {
        key: 'inventory',
        label: 'Stock Levels',
        path: '/inventory',
        icon: WarehouseRounded,
        menu: 'inventory',
        hint: 'Check what is running low',
      },
    ],
  },
  {
    key: 'purchasing',
    label: 'Purchasing',
    icon: ShoppingBagRounded,
    items: [
      {
        key: 'suppliers',
        label: 'Suppliers',
        path: '/suppliers',
        icon: StorefrontRounded,
        menu: 'suppliers',
        hint: 'People you buy from',
      },
      {
        key: 'purchase-orders',
        label: 'Purchase Orders',
        path: '/purchase-orders',
        icon: LocalShippingRounded,
        menu: 'purchase-orders',
        hint: 'Order stock from suppliers',
      },
    ],
  },
  {
    key: 'money',
    label: 'Money',
    icon: SavingsRounded,
    items: [
      {
        key: 'accounting',
        label: 'Accounts',
        path: '/accounting',
        icon: AccountBalanceRounded,
        menu: 'accounting',
        hint: 'Cash, bank and ledger',
      },
      {
        key: 'expenses',
        label: 'Expenses',
        path: '/expenses',
        icon: ReceiptRounded,
        menu: 'expenses',
        hint: 'Record shop spending',
      },
      {
        key: 'reports',
        label: 'Reports',
        path: '/reports',
        icon: BarChartRounded,
        menu: 'reports',
        hint: 'Sales and performance reports',
      },
    ],
  },
  {
    key: 'staff',
    label: 'Staff',
    icon: GroupsRounded,
    items: [
      {
        key: 'attendance',
        label: 'Attendance',
        path: '/attendance',
        icon: AccessTimeRounded,
        menu: 'attendance',
        hint: 'Check in and check out',
      },
      {
        key: 'users',
        label: 'Employees',
        path: '/users',
        icon: BadgeRounded,
        menu: 'users',
        hint: 'Staff accounts and roles',
        aliases: ['/user-management'],
      },
      {
        key: 'salary',
        label: 'Salary',
        path: '/salary',
        icon: PaidRounded,
        menu: 'salary-management',
        hint: 'Give salary and process the month',
        aliases: ['/salary-management', '/salary-advances'],
      },
    ],
  },
  {
    key: 'setup',
    label: 'Setup',
    icon: TuneRounded,
    items: [
      {
        key: 'settings',
        label: 'Settings',
        path: '/settings',
        icon: SettingsRounded,
        menu: 'settings',
        hint: 'Shop name, currency, printing',
      },
      {
        key: 'permissions',
        label: 'Permissions',
        path: '/permission-management',
        icon: AdminPanelSettingsRounded,
        menu: 'permission-management',
        hint: 'Who can see what',
      },
    ],
  },
]

/** Keys shown in the phone bottom bar, in order. A "Menu" button is always appended. */
export const mobileNavKeys = ['dashboard', 'pos', 'orders', 'customers']

/** Keys shown as big tiles on the dashboard, in order. */
export const quickActionKeys = [
  'pos',
  'orders',
  'due-payments',
  'customers',
  'inventory',
  'photocopy',
  'attendance',
  'expenses',
]

/** Pages that live outside the grouped menu but still need a title. */
const extraPageTitles: Record<string, string> = {
  '/profile': 'My Profile',
  '/purchase-orders/new': 'New Purchase Order',
}

export interface NavMatch {
  group: NavGroup
  item: NavItem
}

export const getAllNavItems = (groups: NavGroup[] = navigation): NavItem[] =>
  groups.flatMap(group => group.items)

/**
 * Resolve the current pathname to a nav item.
 * Exact path or alias wins; otherwise the longest item path that is a prefix
 * (so `/purchase-orders/new` resolves to Purchase Orders).
 */
export const findNavItem = (
  pathname: string,
  groups: NavGroup[] = navigation,
): NavMatch | undefined => {
  let best: NavMatch | undefined
  let bestLength = -1

  for (const group of groups) {
    for (const item of group.items) {
      const candidates = [item.path, ...(item.aliases ?? [])]
      for (const candidate of candidates) {
        if (candidate === pathname) {
          return { group, item }
        }
        if (pathname.startsWith(`${candidate}/`) && candidate.length > bestLength) {
          best = { group, item }
          bestLength = candidate.length
        }
      }
    }
  }

  return best
}

/** Title for the top bar. Falls back to known extra pages, then `undefined`. */
export const getPageTitle = (pathname: string, groups: NavGroup[] = navigation): string | undefined =>
  extraPageTitles[pathname] ?? findNavItem(pathname, groups)?.item.label

export interface NavVisibility {
  canView: (menuName: string) => boolean
  photocopyEnabled: boolean
}

/** Keep only the items the user may see, and drop groups that end up empty. */
export const filterNavigation = (
  groups: NavGroup[],
  { canView, photocopyEnabled }: NavVisibility,
): NavGroup[] =>
  groups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.requiresPhotocopy && !photocopyEnabled) return false
        if (item.menu && !canView(item.menu)) return false
        return true
      }),
    }))
    .filter(group => group.items.length > 0)

/** Friendly role names for the user card. */
export const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
  OPERATOR: 'Operator',
  STAFF: 'Staff',
}
