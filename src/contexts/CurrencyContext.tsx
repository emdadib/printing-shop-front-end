import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { formatCurrency, getCurrencyInfo, CurrencyInfo } from '@/utils/currency';

interface CurrencyContextType {
  currencyCode: string;
  currencySymbol: string;
  currencyInfo: CurrencyInfo;
  formatCurrency: (amount: number) => string;
  setCurrency: (currencyCode: string) => void;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const { getSettingValue, loading: settingsLoading } = useSettings();
  const [currencyCode, setCurrencyCode] = useState<string>('USD');

  useEffect(() => {
    if (!settingsLoading) {
      const savedCurrency = getSettingValue('CURRENCY', 'USD');
      setCurrencyCode(savedCurrency);
    }
  }, [settingsLoading, getSettingValue]);

  const currencyInfo = getCurrencyInfo(currencyCode);
  const currencySymbol = getCurrencyInfo(currencyCode).symbol;

  const formatCurrencyAmount = (amount: number): string => {
    return formatCurrency(amount, currencyCode);
  };

  const setCurrency = (newCurrencyCode: string) => {
    setCurrencyCode(newCurrencyCode);
  };

  const value: CurrencyContextType = {
    currencyCode,
    currencySymbol,
    currencyInfo,
    formatCurrency: formatCurrencyAmount,
    setCurrency,
    loading: settingsLoading,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
