import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface InventoryItem {
  id: string
  productId: string
  quantity: number
  reserved: number
  available: number
  lastUpdated: string
  product: {
    id: string
    name: string
    sku: string
    minStock: number
    maxStock: number | null
    unit: string
  }
}

interface InventoryState {
  items: InventoryItem[]
  loading: boolean
  error: string | null
}

const initialState: InventoryState = {
  items: [],
  loading: false,
  error: null,
}

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setInventoryItems: (state, action: PayloadAction<InventoryItem[]>) => {
      state.items = action.payload
      state.loading = false
      state.error = null
    },
    updateInventoryItem: (state, action: PayloadAction<Partial<InventoryItem> & { id: string }>) => {
      const index = state.items.findIndex(item => item.id === action.payload.id)
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload }
      }
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

export const { setInventoryItems, updateInventoryItem, setLoading, setError, clearError } = inventorySlice.actions
export default inventorySlice.reducer 