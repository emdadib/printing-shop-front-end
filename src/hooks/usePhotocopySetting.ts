import { useQuery } from 'react-query';
import { apiService } from '@/services/api';

// Cache key for React Query
const PHOTOCOPY_SETTING_KEY = 'photocopy-setting';

// Fetch function with error handling
const fetchPhotocopySetting = async (): Promise<boolean> => {
  try {
    const response = await apiService.get('/settings/PHOTOCOPY_SERVICE_ENABLED');
    
    if (response.success && response.data) {
      return response.data.value === 'true';
    } else {
      // If setting doesn't exist, create it with default value (enabled)
      try {
        await apiService.post('/settings', {
          key: 'PHOTOCOPY_SERVICE_ENABLED',
          value: 'true',
          description: 'Enable or disable the photocopy service',
          isPublic: true
        });
        return true;
      } catch (createErr) {
        console.error('Failed to create photocopy setting:', createErr);
        return true; // Default to enabled
      }
    }
  } catch (err) {
    console.error('Failed to fetch photocopy setting:', err);
    // Default to enabled if there's an error
    return true;
  }
};

export const usePhotocopySetting = () => {
  const { data: isEnabled = true, isLoading: loading, error, refetch } = useQuery<boolean>(
    PHOTOCOPY_SETTING_KEY,
    fetchPhotocopySetting,
    {
      staleTime: 10 * 60 * 1000, // Cache for 10 minutes (settings don't change often)
      cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: false, // Don't refetch on component mount if data exists
      retry: 1, // Only retry once on failure
    }
  );

  return {
    isEnabled,
    loading,
    error: error ? 'Failed to fetch photocopy setting' : null,
    refetch: () => refetch()
  };
};
