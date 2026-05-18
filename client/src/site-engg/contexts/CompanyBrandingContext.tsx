import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { companyProfileService, CompanyProfile } from '../services/companyProfileService';

interface CompanyBrandingContextType {
  branding: CompanyProfile | null;
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const CompanyBrandingContext = createContext<CompanyBrandingContextType | undefined>(undefined);

export function CompanyBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBranding = async () => {
    try {
      const profile = await companyProfileService.getCompanyProfile();
      setBranding(profile);
    } catch (error) {
      console.error('Error loading company branding:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranding();
  }, []);

  const refreshBranding = async () => {
    setLoading(true);
    await loadBranding();
  };

  return (
    <CompanyBrandingContext.Provider value={{ branding, loading, refreshBranding }}>
      {children}
    </CompanyBrandingContext.Provider>
  );
}

export function useCompanyBranding() {
  const context = useContext(CompanyBrandingContext);
  if (context === undefined) {
    throw new Error('useCompanyBranding must be used within a CompanyBrandingProvider');
  }
  return context;
}
