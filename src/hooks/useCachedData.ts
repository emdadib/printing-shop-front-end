import { useState, useEffect } from 'react';
import { dataService } from '@/services/dataService';

// Generic hook for cached data fetching
export function useCachedData<T>(
  _key: string,
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchFn();
        
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}

// Specific hooks for common data types
export const useProducts = () => useCachedData('products', dataService.getProducts);
export const useCustomers = () => useCachedData('customers', dataService.getCustomers);
export const useOrders = () => useCachedData('orders', dataService.getOrders);
export const useCategories = () => useCachedData('categories', dataService.getCategories);
export const useSuppliers = () => useCachedData('suppliers', dataService.getSuppliers);
export const useWarranties = () => useCachedData('warranties', dataService.getWarranties);
export const useSettings = () => useCachedData('settings', dataService.getSettings);
export const useDashboardStats = () => useCachedData('dashboard-stats', dataService.getDashboardStats);

// Hook for inventory with parameters
export const useInventory = (params?: { search?: string; category?: string; lowStock?: boolean }) => {
  return useCachedData(
    `inventory-${JSON.stringify(params || {})}`,
    () => dataService.getInventory(params),
    [params?.search, params?.category, params?.lowStock]
  );
};

// Hook for purchase orders
export const usePurchaseOrders = () => useCachedData('purchase-orders', dataService.getPurchaseOrders);
export const usePurchaseOrderStats = () => useCachedData('purchase-orders-stats', dataService.getPurchaseOrderStats);

// Hook for accounting data
export const useAccountingSummary = () => useCachedData('accounting-summary', dataService.getAccountingSummary);
export const useCompanyLedger = (page: number = 1, limit: number = 10) => {
  return useCachedData(
    `company-ledger-${page}-${limit}`,
    () => dataService.getCompanyLedger(page, limit),
    [page, limit]
  );
};

// Hook for supplier stats
export const useSupplierStats = () => useCachedData('supplier-stats', dataService.getSupplierStats);

export default useCachedData;
