import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  company: string | null
  taxId: string | null
  isActive: boolean
  loyaltyPoints: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface CustomersState {
  customers: Customer[]
  loading: boolean
  error: string | null
}

const initialState: CustomersState = {
  customers: [],
  loading: false,
  error: null,
}

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setCustomers: (state, action: PayloadAction<Customer[]>) => {
      state.customers = action.payload
      state.loading = false
      state.error = null
    },
    addCustomer: (state, action: PayloadAction<Customer>) => {
      state.customers.push(action.payload)
    },
    updateCustomer: (state, action: PayloadAction<Partial<Customer> & { id: string }>) => {
      const index = state.customers.findIndex(customer => customer.id === action.payload.id)
      if (index !== -1) {
        state.customers[index] = { ...state.customers[index], ...action.payload }
      }
    },
    removeCustomer: (state, action: PayloadAction<string>) => {
      state.customers = state.customers.filter(customer => customer.id !== action.payload)
    },
    updateLoyaltyPoints: (state, action: PayloadAction<{ id: string; points: number }>) => {
      const index = state.customers.findIndex(customer => customer.id === action.payload.id)
      if (index !== -1) {
        state.customers[index].loyaltyPoints = action.payload.points
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

export const {
  setCustomers,
  addCustomer,
  updateCustomer,
  removeCustomer,
  updateLoyaltyPoints,
  setLoading,
  setError,
  clearError,
} = customersSlice.actions

export default customersSlice.reducer 