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

  const role = currentRole.toLowerCase().trim();

  const roleConfig: Record<string, { label: string; color: string; dot: string }> = {
    admin:    { label: 'Administrator',  color: 'bg-violet-50 text-violet-600 ring-1 ring-violet-200', dot: 'bg-violet-500' },
    engineer: { label: 'Field Engineer', color: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',       dot: 'bg-blue-500' },
    hr:       { label: 'HR Manager',     color: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
    client:   { label: 'Client Portal',  color: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',    dot: 'bg-amber-500' },
  };

  const cfg = roleConfig[role] || roleConfig.engineer;
  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const avatarColor: Record<string, string> = {
    admin:    'from-violet-500 to-violet-700',
    engineer: 'from-blue-500 to-blue-700',
    hr:       'from-emerald-500 to-emerald-700',
    client:   'from-amber-500 to-orange-600',
  };
  const av = avatarColor[role] || avatarColor.engineer;

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50 h-14 flex items-center shadow-[0_1px_0_0_#f1f5f9,0_1px_6px_rgba(0,0,0,0.04)]">
      <div className="w-full max-w-[1440px] mx-auto px-5 lg:px-8 flex items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shrink-0 shadow-sm">
            <HardHat className="w-4 h-4 text-white/90" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-800 font-bold text-sm tracking-tight hidden sm:block truncate">
              {branding?.company_name || 'Cybaem Tech'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:block shrink-0" />
            <span className="text-slate-500 font-medium text-sm hidden sm:block">Site Engineering</span>
          </div>
          <div className="w-px h-4 bg-slate-200 shrink-0 mx-1" />
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shrink-0 ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-1.5 mr-1">
            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${av} flex items-center justify-center shrink-0`}>
              <span className="text-white font-bold text-[9px]">{initials}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
              <span className="text-slate-600 text-xs font-medium hidden sm:block truncate max-w-[120px]">{userName}</span>
            </div>
          </div>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button onClick={() => setLocation('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all text-xs font-semibold">
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Portal</span>
          </button>
          {onProfileClick && (
            <button onClick={onProfileClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all text-xs font-semibold">
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </button>
          )}
          <button onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all text-xs font-semibold">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
