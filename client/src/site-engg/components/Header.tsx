import { useAuth } from '../contexts/AuthContext';
import { useCompanyBranding } from '../contexts/CompanyBrandingContext';
import { LogOut, User, Home, HardHat } from 'lucide-react';
import { useLocation } from 'wouter';

interface HeaderProps {
  currentRole: string;
  userName: string;
  onProfileClick?: () => void;
}

export default function Header({ currentRole, userName, onProfileClick }: HeaderProps) {
  const { signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { branding } = useCompanyBranding();

  const normalizedRole = currentRole.toLowerCase().trim();

  const roleConfig: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
    admin:    { label: 'Administrator',  dotClass: 'bg-violet-500', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200' },
    engineer: { label: 'Field Engineer', dotClass: 'bg-blue-500',   badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    hr:       { label: 'HR Manager',     dotClass: 'bg-emerald-500',badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    client:   { label: 'Client Portal',  dotClass: 'bg-amber-500',  badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  };

  const config = roleConfig[normalizedRole] || roleConfig.engineer;

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-8 h-14 flex items-center justify-between gap-4">

        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <HardHat className="w-4 h-4 text-white" />
          </div>
          <span className="text-gray-900 font-bold text-sm tracking-tight hidden sm:block truncate">
            {branding?.company_name || 'Cybaem Tech'}
          </span>
          <div className="w-px h-4 bg-gray-200 shrink-0" />
          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border shrink-0 ${config.badgeClass}`}>
            {config.label}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 mr-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${config.dotClass}`} />
            <span className="text-gray-600 text-xs font-medium hidden sm:block truncate max-w-[120px]">{userName}</span>
          </div>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <button
            onClick={() => setLocation('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all text-xs font-medium"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Main Portal</span>
          </button>
          {onProfileClick && (
            <button
              onClick={onProfileClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all text-xs font-medium"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </button>
          )}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all text-xs font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
