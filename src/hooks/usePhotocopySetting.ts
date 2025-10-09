import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

export const usePhotocopySetting = () => {
  const [isEnabled, setIsEnabled] = useState<boolean>(true); // Default to enabled
  const [loading, setLoading] = useState(true);
  const [error, _setError] = useState<string | null>(null);

  useEffect(() => {
    checkPhotocopySetting();
  }, []);

  const checkPhotocopySetting = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/settings/PHOTOCOPY_SERVICE_ENABLED');
      
      if (response.success && response.data) {
        setIsEnabled(response.data.value === 'true');
      } else {
        // If setting doesn't exist, create it with default value (enabled)
        try {
          await apiService.post('/settings', {
            key: 'PHOTOCOPY_SERVICE_ENABLED',
            value: 'true',
            description: 'Enable or disable the photocopy service',
            isPublic: true
          });
          setIsEnabled(true);
        } catch (createErr) {
          console.error('Failed to create photocopy setting:', createErr);
          setIsEnabled(true); // Default to enabled
        }
      }
    } catch (err) {
      console.error('Failed to fetch photocopy setting:', err);
      // Default to enabled if there's an error
      setIsEnabled(true);
    } finally {
      setLoading(false);
    }
  };

  return {
    isEnabled,
    loading,
    error,
    refetch: checkPhotocopySetting
  };
};
