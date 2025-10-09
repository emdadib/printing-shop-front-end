import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery } from 'react-query'
import { Box, CircularProgress } from '@mui/material'

import { Layout } from '@/components/Layout'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { CompanyProvider } from '@/contexts/CompanyContext'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ProductsPage from '@/pages/ProductsPage'
import CategoriesPage from '@/pages/CategoriesPage'
import InventoryPage from '@/pages/InventoryPage'
import OrdersPage from '@/pages/OrdersPage'
import CustomersPage from '@/pages/CustomersPage'
import SuppliersPage from '@/pages/SuppliersPage'
import PurchaseOrdersPage from '@/pages/PurchaseOrdersPage'
import AccountingPage from '@/pages/AccountingPage'
import ExpensePage from '@/pages/ExpensePage'
// import UsersPage from '@/pages/UsersPage' // Unused import
import UserManagementPage from '@/pages/UserManagementPage'
import PermissionManagementPage from '@/pages/PermissionManagementPage'
import ReportsPage from '@/pages/ReportsPage'
import WarrantiesPage from '@/pages/WarrantiesPage'
import SettingsPage from '@/pages/SettingsPage'
import UserProfilePage from '@/pages/UserProfilePage'
import PhotocopyPage from '@/pages/PhotocopyPage'
import CombinedSalaryPage from '@/pages/CombinedSalaryPage'

import { useAuth } from '@/hooks/useAuth'
import { usePhotocopySetting } from '@/hooks/usePhotocopySetting'
import { authApi } from '@/services/authApi'
import { RootState } from '@/store'
import { setUser } from '@/store/slices/authSlice'

const App: React.FC = () => {
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  const { initializeAuth } = useAuth()
  const { isEnabled: photocopyEnabled } = usePhotocopySetting()

  // Check if user is authenticated on app load
  const { isLoading } = useQuery(
    'auth-check',
    authApi.checkAuth,
    {
      enabled: !isAuthenticated,
      retry: false,
      onSuccess: (data) => {
        if (data.user) {
          dispatch(setUser(data.user))
        }
      },
      onError: () => {
        // User is not authenticated, clear any stale data
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      }
    }
  )

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  // Public routes (no authentication required)
  if (!isAuthenticated) {
    return (
      <CurrencyProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {photocopyEnabled && <Route path="/photocopy" element={<PhotocopyPage />} />}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </CurrencyProvider>
    )
  }

  // Protected routes (authentication required)
  return (
    <CompanyProvider>
      <CurrencyProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/accounting" element={<AccountingPage />} />
            <Route path="/expenses" element={<ExpensePage />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/user-management" element={<UserManagementPage />} />
            <Route path="/salary-management" element={<CombinedSalaryPage />} />
            <Route path="/salary-advances" element={<CombinedSalaryPage />} />
            <Route path="/permission-management" element={<PermissionManagementPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/warranties" element={<WarrantiesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
            {photocopyEnabled && <Route path="/photocopy" element={<PhotocopyPage />} />}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </CurrencyProvider>
    </CompanyProvider>
  )
}

export default App 