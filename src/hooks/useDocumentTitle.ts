import { useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';

export const useDocumentTitle = (pageTitle?: string) => {
  const { companyInfo } = useCompany();

  useEffect(() => {
    const baseTitle = companyInfo.name || 'PrintShop';
    const title = pageTitle ? `${pageTitle} - ${baseTitle}` : baseTitle;
    
    document.title = title;
    
    // Update meta tags
    const metaTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (metaTitle) {
      metaTitle.setAttribute('content', baseTitle);
    }
  }, [companyInfo.name, pageTitle]);
};
