import { apiService } from './api';

// Cache for storing fetched data
const cache = new Map<string, { data: any; timestamp: number; promise?: Promise<any> }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Generic cached fetch function
async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  useCache: boolean = true
): Promise<T> {
  const now = Date.now();
  
  // Check if we have valid cached data
  if (useCache && cache.has(key)) {
    const cached = cache.get(key)!;
    
    // If data is still fresh, return it
    if (now - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    // If there's already a request in progress, wait for it
    if (cached.promise) {
      return cached.promise;
    }
  }
  
  // Create a new request
  const promise = fetchFn().then((data) => {
    // Cache the result
    cache.set(key, { data, timestamp: now });
    return data;
  }).catch((error) => {
    // Remove failed request from cache
    cache.delete(key);
    throw error;
  });
  
  // Store the promise to prevent duplicate requests
  cache.set(key, { data: null, timestamp: now, promise });
  
  return promise;
}

// Clear cache function
export function clearCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

// Data service with cached methods
export const dataService = {
  // Products
  getProducts: () => cachedFetch('products', () => apiService.get('/products')),
  
  // Customers
  getCustomers: () => cachedFetch('customers', () => apiService.get('/customers')),
  
  // Orders
  getOrders: () => cachedFetch('orders', () => apiService.get('/orders')),
  
  // Categories
  getCategories: () => cachedFetch('categories', () => apiService.get('/products/categories/all')),
  
  // Suppliers
  getSuppliers: () => cachedFetch('suppliers', () => apiService.get('/suppliers')),
  
  // Warranties
  getWarranties: () => cachedFetch('warranties', () => apiService.get('/warranties')),
  
  // Inventory
  getInventory: (params?: { search?: string; category?: string; lowStock?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.lowStock) queryParams.append('lowStock', 'true');
    
    const key = `inventory-${queryParams.toString()}`;
    const url = `/inventory${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return cachedFetch(key, () => apiService.get(url));
  },
  
  // Purchase Orders
  getPurchaseOrders: () => cachedFetch('purchase-orders', () => apiService.get('/purchase-orders')),
  getPurchaseOrderStats: () => cachedFetch('purchase-orders-stats', () => apiService.get('/purchase-orders/stats')),
  
  // Settings
  getSettings: () => cachedFetch('settings', () => apiService.get('/settings')),
  
  // Dashboard
  getDashboardStats: () => cachedFetch('dashboard-stats', () => apiService.get('/reports/dashboard')),
  
  // Accounting
  getAccountingSummary: () => cachedFetch('accounting-summary', () => apiService.get('/accounting/summary')),
  getCompanyLedger: (page: number = 1, limit: number = 10) => {
    const key = `company-ledger-${page}-${limit}`;
    return cachedFetch(key, () => apiService.get(`/accounting/company/ledger?page=${page}&limit=${limit}`));
  },
  
  // Supplier Stats
  getSupplierStats: () => cachedFetch('supplier-stats', () => apiService.get('/suppliers/stats')),
  
  // Clear specific cache entries
  clearProductsCache: () => clearCache('products'),
  clearCustomersCache: () => clearCache('customers'),
  clearOrdersCache: () => clearCache('orders'),
  clearCategoriesCache: () => clearCache('categories'),
  clearSuppliersCache: () => clearCache('suppliers'),
  clearWarrantiesCache: () => clearCache('warranties'),
  clearInventoryCache: () => {
    // Clear all inventory cache entries
    for (const key of cache.keys()) {
      if (key.startsWith('inventory-')) {
        cache.delete(key);
      }
    }
  },
  clearPurchaseOrdersCache: () => {
    clearCache('purchase-orders');
    clearCache('purchase-orders-stats');
  },
  clearSettingsCache: () => clearCache('settings'),
  clearDashboardCache: () => clearCache('dashboard-stats'),
  clearAccountingCache: () => {
    clearCache('accounting-summary');
    for (const key of cache.keys()) {
      if (key.startsWith('company-ledger-')) {
        cache.delete(key);
      }
    }
  },
  clearSupplierStatsCache: () => clearCache('supplier-stats'),
  
  // Clear all cache
  clearAllCache: () => clearCache(),
};

export default dataService;
