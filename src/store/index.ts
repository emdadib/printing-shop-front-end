import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

import authReducer from './slices/authSlice'
import uiReducer from './slices/uiSlice'
import inventoryReducer from './slices/inventorySlice'
import productsReducer from './slices/productsSlice'
import ordersReducer from './slices/ordersSlice'
import customersReducer from './slices/customersSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    inventory: inventoryReducer,
    products: productsReducer,
    orders: ordersReducer,
    customers: customersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector 