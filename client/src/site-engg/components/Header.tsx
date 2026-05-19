import { useAuth } from '../contexts/AuthContext';
import { useCompanyBranding } from '../contexts/CompanyBrandingContext';
import { LogOut, User, Home, HardHat, ChevronRight } from 'lucide-react';
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

  const role = (Array.isArray(currentRole) ? currentRole[0] : currentRole || '').toLowerCase().trim();

  const roleConfig: Record<string, { label: string; accent: string; badge: string; dot: string; avatarBg: string }> = {
    admin:    { label: 'Administrator',  accent: 'bg-violet-600', badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',  dot: 'bg-violet-500',  avatarBg: 'bg-violet-600' },
    engineer: { label: 'Field Engineer', accent: 'bg-blue-600',   badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',        dot: 'bg-blue-500',    avatarBg: 'bg-blue-600' },
    hr:       { label: 'HR Manager',     accent: 'bg-emerald-600',badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',dot: 'bg-emerald-500', avatarBg: 'bg-emerald-600' },
    client:   { label: 'Client Portal',  accent: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',     dot: 'bg-amber-500',   avatarBg: 'bg-amber-500' },
  };

  const cfg = roleConfig[role] || roleConfig.engineer;
  const nameParts = (userName || 'U').split(' ');
  const initials = nameParts.map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 h-14">
      <div className={`h-0.5 w-full ${cfg.accent}`} />
      <div className="h-[calc(3.5rem-2px)] flex items-center w-full px-5 lg:px-6 justify-between gap-4">

        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg ${cfg.avatarBg} flex items-center justify-center shrink-0`}>
            <HardHat className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-800 font-bold text-sm tracking-tight hidden sm:block truncate">
              {branding?.company_name || 'Cybaem Tech'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:block shrink-0" />
            <span className="text-slate-500 font-medium text-sm hidden sm:block">Site Engineering</span>
          </div>
          <div className="w-px h-4 bg-slate-200 shrink-0 mx-1" />
          <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold shrink-0 ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-1.5">
            <div className={`w-7 h-7 rounded-full ${cfg.avatarBg} flex items-center justify-center shrink-0`}>
              <span className="text-white font-bold text-[11px]">{initials}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${cfg.dot}`} />
              <span className="text-slate-600 text-xs font-semibold hidden sm:block truncate max-w-[120px]">{userName}</span>
            </div>
          </div>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          <button onClick={() => setLocation('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-all text-xs font-medium">
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Portal</span>
          </button>

          {onProfileClick && (
            <button onClick={onProfileClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-all text-xs font-medium">
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </button>
          )}

          <button onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all text-xs font-medium ml-0.5">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
