// Currency utility functions
export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-EU' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', locale: 'bn-BD' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
};

export const getCurrencyInfo = (currencyCode: string): CurrencyInfo => {
  return CURRENCIES[currencyCode] || CURRENCIES.USD;
};

export const formatCurrency = (amount: number, currencyCode: string = 'USD'): string => {
  const currencyInfo = getCurrencyInfo(currencyCode);
  
  try {
    return new Intl.NumberFormat(currencyInfo.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    return `${currencyInfo.symbol}${amount.toFixed(2)}`;
  }
};

export const getCurrencySymbol = (currencyCode: string = 'USD'): string => {
  return getCurrencyInfo(currencyCode).symbol;
};

export const parseCurrency = (value: string, currencyCode: string = 'USD'): number => {
  const currencyInfo = getCurrencyInfo(currencyCode);
  // Remove currency symbol and parse
  const cleanValue = value.replace(currencyInfo.symbol, '').replace(/,/g, '');
  return parseFloat(cleanValue) || 0;
};
