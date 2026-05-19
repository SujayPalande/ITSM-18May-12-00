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

  const roleConfig: Record<string, { label: string; gradient: string; dot: string; badge: string; accentBar: string }> = {
    admin:    { label: 'Administrator',  gradient: 'from-violet-600 to-purple-700',  dot: 'bg-violet-400',  badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20',  accentBar: 'from-violet-600 via-blue-500 to-violet-600' },
    engineer: { label: 'Field Engineer', gradient: 'from-blue-600 to-indigo-700',    dot: 'bg-blue-400',    badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20',          accentBar: 'from-blue-600 via-indigo-500 to-blue-600' },
    hr:       { label: 'HR Manager',     gradient: 'from-emerald-600 to-teal-700',   dot: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', accentBar: 'from-emerald-600 via-teal-500 to-emerald-600' },
    client:   { label: 'Client Portal',  gradient: 'from-amber-500 to-orange-600',   dot: 'bg-amber-400',   badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',       accentBar: 'from-amber-500 via-orange-400 to-amber-500' },
  };

  const cfg = roleConfig[role] || roleConfig.engineer;
  const nameParts = (userName || 'U').split(' ');
  const initials = nameParts.map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="bg-[#0d1117] border-b border-white/[0.06] sticky top-0 z-50 h-14 flex flex-col">
      <div className={`h-0.5 w-full bg-gradient-to-r ${cfg.accentBar} opacity-80`} />

      <div className="flex-1 flex items-center w-full px-5 lg:px-6 justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0 shadow-lg ring-1 ring-white/10`}>
            <HardHat className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white font-extrabold text-sm tracking-tight hidden sm:block truncate">
              {branding?.company_name || 'Cybaem Tech'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-white/20 hidden sm:block shrink-0" />
            <span className="text-white/40 font-medium text-sm hidden sm:block">Site Engineering</span>
          </div>
          <div className="w-px h-4 bg-white/10 shrink-0 mx-1.5" />
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest shrink-0 border ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-1.5 mr-1">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0 shadow-md ring-1 ring-white/10`}>
              <span className="text-white font-bold text-[10px]">{initials}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${cfg.dot}`} />
              <span className="text-white/60 text-xs font-semibold hidden sm:block truncate max-w-[120px]">{userName}</span>
            </div>
          </div>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          <button onClick={() => setLocation('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all text-xs font-semibold">
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Portal</span>
          </button>

          {onProfileClick && (
            <button onClick={onProfileClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all text-xs font-semibold">
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </button>
          )}

          <button onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-xs font-semibold ml-0.5">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
