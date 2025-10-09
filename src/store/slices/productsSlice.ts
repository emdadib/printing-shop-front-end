import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Product {
  id: string
  name: string
  description: string | null
  sku: string
  barcode: string | null
  categoryId: string
  type: 'PHYSICAL' | 'SERVICE' | 'DIGITAL'
  price: number
  costPrice: number
  taxRate: number
  isActive: boolean
  isService: boolean
  hasInventory: boolean
  minStock: number
  maxStock: number | null
  unit: string
  weight: number | null
  dimensions: string | null
  imageUrl: string | null
  specifications: any
  category: {
    id: string
    name: string
  }
}

interface ProductsState {
  products: Product[]
  categories: Array<{
    id: string
    name: string
    description: string | null
    parentId: string | null
    children: any[]
  }>
  loading: boolean
  error: string | null
}

const initialState: ProductsState = {
  products: [],
  categories: [],
  loading: false,
  error: null,
}

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload
      state.loading = false
      state.error = null
    },
    addProduct: (state, action: PayloadAction<Product>) => {
      state.products.push(action.payload)
    },
    updateProduct: (state, action: PayloadAction<Partial<Product> & { id: string }>) => {
      const index = state.products.findIndex(product => product.id === action.payload.id)
      if (index !== -1) {
        state.products[index] = { ...state.products[index], ...action.payload }
      }
    },
    removeProduct: (state, action: PayloadAction<string>) => {
      state.products = state.products.filter(product => product.id !== action.payload)
    },
    setCategories: (state, action: PayloadAction<ProductsState['categories']>) => {
      state.categories = action.payload
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
  setProducts,
  addProduct,
  updateProduct,
  removeProduct,
  setCategories,
  setLoading,
  setError,
  clearError,
} = productsSlice.actions

export default productsSlice.reducer 