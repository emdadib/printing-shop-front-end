import { useState, useEffect } from 'react';
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

export const useSettings = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/settings');
      if (response.success && Array.isArray(response.data)) {
        setSettings(response.data);
      } else if (Array.isArray(response)) {
        setSettings(response);
      } else {
        setSettings([]);
      }
    } catch (err) {
      setError('Failed to load settings');
      console.error('Settings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

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
    error,
    getSettingValue,
    formatCurrency,
    refetch: fetchSettings
  };
};
