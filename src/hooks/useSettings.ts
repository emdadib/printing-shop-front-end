import { useQuery } from 'react-query';
import { apiService } from '@/services/api';

interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// Cache key for React Query
const SETTINGS_KEY = 'settings';

// Fetch function
const fetchSettings = async (): Promise<Setting[]> => {
  const response = await apiService.get('/settings');
  if (response.success && Array.isArray(response.data)) {
    return response.data;
  } else if (Array.isArray(response)) {
    return response;
  } else {
    return [];
  }
};

export const useSettings = (enabled: boolean = true) => {
  const { data: settings = [], isLoading: loading, error, refetch } = useQuery<Setting[]>(
    SETTINGS_KEY,
    fetchSettings,
    {
      enabled, // Only fetch when enabled (user is authenticated)
      staleTime: 10 * 60 * 1000, // Cache for 10 minutes (settings don't change often)
      cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: false, // Don't refetch on component mount if data exists
      retry: 1, // Only retry once on failure
    }
  );

  const getSettingValue = (key: string, defaultValue: string = '') => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || defaultValue;
  };

  const formatCurrency = (amount: number, currency?: string) => {
    const currencyCode = currency || getSettingValue('CURRENCY', 'USD');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  };

  return {
    settings,
    loading,
    error: error ? 'Failed to load settings' : null,
    getSettingValue,
    formatCurrency,
    refetch: () => refetch()
  };
};
