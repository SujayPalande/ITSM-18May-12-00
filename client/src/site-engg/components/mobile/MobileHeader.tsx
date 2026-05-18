import { Building2 } from 'lucide-react';
import { useCompanyBranding } from '../../contexts/CompanyBrandingContext';

interface MobileHeaderProps {
  userName: string;
  userRole?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function MobileHeader({ userName, userRole, subtitle, children }: MobileHeaderProps) {
  const { branding } = useCompanyBranding();

  const primaryColor = branding?.primary_color || '#2563eb';
  const secondaryColor = branding?.secondary_color || '#1e40af';
  const brandName = branding?.brand_name || 'Site Engineer';
  const logoUrl = branding?.logo_url;

  return (
    <div
      className="text-slate-800 px-6 py-8 shadow-xl"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="h-12 object-contain bg-white/95 rounded-2xl px-3 py-2 shadow-sm" />
          ) : (
            <div className="bg-white/95 p-3 rounded-2xl shadow-sm">
              <Building2 className="w-6 h-6" style={{ color: primaryColor }} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight">Hi, {userName.split(' ')[0]}</h1>
            {userRole && (
              <p className="text-slate-800 text-[10px] font-bold uppercase tracking-widest mt-0.5">{userRole}</p>
            )}
          </div>
        </div>
        {children}
      </div>

      {subtitle && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-inner">
          <p className="text-slate-900 text-sm font-medium">
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
