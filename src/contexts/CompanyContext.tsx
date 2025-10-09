import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSettings } from '@/hooks/useSettings';

interface CompanyInfo {
  name: string;
  logo?: string;
  address: string;
  phone: string;
  email: string;
}

interface CompanyContextType {
  companyInfo: CompanyInfo;
  loading: boolean;
  updateCompanyInfo: (info: Partial<CompanyInfo>) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const { getSettingValue, loading } = useSettings();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: 'PrintShop',
    address: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (!loading) {
      setCompanyInfo({
        name: getSettingValue('COMPANYNAME', 'PrintShop'),
        logo: getSettingValue('COMPANYLOGO', ''),
        address: getSettingValue('COMPANYADDRESS', ''),
        phone: getSettingValue('COMPANYPHONE', ''),
        email: getSettingValue('COMPANYEMAIL', '')
      });
    }
  }, [loading]); // Removed getSettingValue from dependencies

  const updateCompanyInfo = (info: Partial<CompanyInfo>) => {
    setCompanyInfo(prev => ({ ...prev, ...info }));
  };

  return (
    <CompanyContext.Provider value={{ companyInfo, loading, updateCompanyInfo }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
