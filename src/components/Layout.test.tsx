import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { ThemeProvider } from '@mui/material/styles'
import authReducer, { setUser } from '@/store/slices/authSlice'
import uiReducer from '@/store/slices/uiSlice'
import { theme } from '@/theme'
import { Layout } from './Layout'

// Which backend menu names the fake user may see ('all' = everything).
const access = vi.hoisted(() => ({ allowed: 'all' as string[] | 'all' }))

vi.mock('@/contexts/CompanyContext', () => ({
  useCompany: () => ({
    companyInfo: { name: 'SB Printers', address: '', phone: '', email: '' },
    loading: false,
    updateCompanyInfo: vi.fn(),
  }),
}))

vi.mock('@/hooks/useDocumentTitle', () => ({ useDocumentTitle: vi.fn() }))

vi.mock('@/hooks/useAccessibleMenus', () => ({
  useAccessibleMenus: () => ({
    accessibleMenus: [],
    loading: false,
    error: null,
    canViewMenu: (name: string) => access.allowed === 'all' || access.allowed.includes(name),
    getAccessibleMenuNames: () => new Set<string>(),
    refetch: vi.fn(),
  }),
}))

vi.mock('@/hooks/usePhotocopySetting', () => ({
  usePhotocopySetting: () => ({ isEnabled: true, loading: false, error: null, refetch: vi.fn() }),
}))

const makeStore = () => {
  const store = configureStore({ reducer: { auth: authReducer, ui: uiReducer } })
  store.dispatch(
    setUser({
      id: 'u1',
      email: 'asha@example.com',
      username: 'asha',
      firstName: 'Asha',
      lastName: 'Rahman',
      role: 'ADMIN',
    }),
  )
  return store
}

const renderAt = (path: string) =>
  render(
    <Provider store={makeStore()}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <Layout>
            <div>Page body</div>
          </Layout>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  )

const mainMenu = () => screen.getByRole('navigation', { name: 'Main menu' })

describe('Layout', () => {
  beforeEach(() => {
    access.allowed = 'all'
    localStorage.clear()
  })

  it('shows the page title, grouped menu and page body', () => {
    renderAt('/orders')

    expect(screen.getByRole('heading', { level: 1, name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByText('Page body')).toBeInTheDocument()

    const menu = within(mainMenu())
    for (const group of ['Sales', 'Stock', 'Purchasing', 'Money', 'Staff', 'Setup']) {
      expect(menu.getByText(group)).toBeInTheDocument()
    }
  })

  it('offers a New Sale shortcut in the top bar', () => {
    renderAt('/orders')
    const topBar = within(screen.getByRole('banner'))
    expect(topBar.getByRole('button', { name: /new sale/i })).toBeInTheDocument()
  })

  it('navigates when a menu item is clicked', () => {
    renderAt('/orders')
    fireEvent.click(within(mainMenu()).getByText('Customers'))
    expect(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument()
  })

  it('opens the current page group and lets the user toggle others', () => {
    renderAt('/orders')
    const menu = within(mainMenu())

    expect(menu.getByRole('button', { name: /^sales$/i })).toHaveAttribute('aria-expanded', 'true')

    const stock = menu.getByRole('button', { name: /^stock$/i })
    expect(stock).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(stock)
    expect(stock).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(stock)
    expect(stock).toHaveAttribute('aria-expanded', 'false')
  })

  it('hides pages the user is not allowed to open', () => {
    access.allowed = ['dashboard', 'orders']
    renderAt('/orders')
    const menu = within(mainMenu())

    expect(menu.getByText('Sales')).toBeInTheDocument()
    expect(menu.getByText('Orders')).toBeInTheDocument()
    expect(menu.queryByText('Customers')).not.toBeInTheDocument()
    expect(menu.queryByText('Stock')).not.toBeInTheDocument()
    expect(menu.queryByText('Setup')).not.toBeInTheDocument()
  })

  it('shows who is signed in', () => {
    renderAt('/dashboard')
    expect(screen.getByText('Asha Rahman')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })
})
