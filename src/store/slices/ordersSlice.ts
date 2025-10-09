import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface OrderItem {
  id: string
  orderId: string
  productId: string
  quantity: number
  unitPrice: number
  discount: number
  taxAmount: number
  total: number
  notes: string | null
  product: {
    id: string
    name: string
    sku: string
  }
}

interface Order {
  id: string
  orderNumber: string
  customerId: string | null
  userId: string
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
  type: 'SALE' | 'PURCHASE' | 'RETURN' | 'TRANSFER'
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  notes: string | null
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  customer?: {
    id: string
    firstName: string
    lastName: string
    email: string | null
  }
  items: OrderItem[]
}

interface OrdersState {
  orders: Order[]
  loading: boolean
  error: string | null
}

const initialState: OrdersState = {
  orders: [],
  loading: false,
  error: null,
}

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrders: (state, action: PayloadAction<Order[]>) => {
      state.orders = action.payload
      state.loading = false
      state.error = null
    },
    addOrder: (state, action: PayloadAction<Order>) => {
      state.orders.push(action.payload)
    },
    updateOrder: (state, action: PayloadAction<Partial<Order> & { id: string }>) => {
      const index = state.orders.findIndex(order => order.id === action.payload.id)
      if (index !== -1) {
        state.orders[index] = { ...state.orders[index], ...action.payload }
      }
    },
    removeOrder: (state, action: PayloadAction<string>) => {
      state.orders = state.orders.filter(order => order.id !== action.payload)
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.loading = false
    },
    clearError: (state) => {
      state.error = null
    },
  },
})

export const {
  setOrders,
  addOrder,
  updateOrder,
  removeOrder,
  setLoading,
  setError,
  clearError,
} = ordersSlice.actions

export default ordersSlice.reducer 