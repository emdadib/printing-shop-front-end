import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { RootState } from '@/store'
import { setUser, setLoading, setError, logout } from '@/store/slices/authSlice'
import { authApi, LoginCredentials, RegisterData } from '@/services/authApi'

export const useAuth = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  )

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        dispatch(setLoading(true))
        dispatch(setError(null))

        const response = await authApi.login(credentials)

        if (response.success && response.data) {
          // Ensure role is properly typed
          const user = {
            ...response.data.user,
            role: response.data.user.role as 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'OPERATOR' | 'STAFF'
          }
          dispatch(setUser(user))
          toast.success('Login successful!')
          navigate('/dashboard')
          return { success: true }
        } else {
          throw new Error('Login failed')
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Login failed'
        dispatch(setError(errorMessage))
        toast.error(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        dispatch(setLoading(false))
      }
    },
    [dispatch, navigate]
  )

  const register = useCallback(
    async (data: RegisterData) => {
      try {
        dispatch(setLoading(true))
        dispatch(setError(null))

        const response = await authApi.register(data)

        if (response.success) {
          toast.success('Registration successful! Please log in.')
          navigate('/login')
          return { success: true }
        } else {
          throw new Error('Registration failed')
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Registration failed'
        dispatch(setError(errorMessage))
        toast.error(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        dispatch(setLoading(false))
      }
    },
    [dispatch, navigate]
  )

  const logoutUser = useCallback(async () => {
    try {
      await authApi.logout()
      dispatch(logout())
      toast.success('Logged out successfully')
      navigate('/login')
    } catch (error: any) {
      console.error('Logout error:', error)
      // Even if logout fails, clear local state
      dispatch(logout())
      navigate('/login')
    }
  }, [dispatch, navigate])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        dispatch(setLoading(true))
        dispatch(setError(null))

        await authApi.changePassword(currentPassword, newPassword)
        toast.success('Password changed successfully!')
        return { success: true }
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Password change failed'
        dispatch(setError(errorMessage))
        toast.error(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        dispatch(setLoading(false))
      }
    },
    [dispatch]
  )

  const initializeAuth = useCallback(() => {
    const token = localStorage.getItem('accessToken')
    if (token && !isAuthenticated) {
      // You might want to verify the token with the server here
      // For now, we'll just check if it exists
      console.log('Token found, user should be authenticated')
    }
  }, [isAuthenticated])

  const clearError = useCallback(() => {
    dispatch(setError(null))
  }, [dispatch])

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout: logoutUser,
    changePassword,
    initializeAuth,
    clearError,
  }
} 