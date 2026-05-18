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

  const role = currentRole.toLowerCase().trim();

  const roleConfig: Record<string, { label: string; dot: string; badge: string }> = {
    admin:    { label: 'Administrator',  dot: 'bg-violet-400', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    engineer: { label: 'Field Engineer', dot: 'bg-blue-400',   badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    hr:       { label: 'HR Manager',     dot: 'bg-emerald-400',badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    client:   { label: 'Client Portal',  dot: 'bg-amber-400',  badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  };

  const cfg = roleConfig[role] || roleConfig.engineer;

  return (
    <header className="bg-[#0f172a] border-b border-white/[0.06] sticky top-0 z-50 h-14 flex items-center">
      <div className="w-full max-w-[1440px] mx-auto px-5 lg:px-8 flex items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <HardHat className="w-3.5 h-3.5 text-white/70" />
          </div>
          <span className="text-white font-black text-sm tracking-tight hidden sm:block truncate">
            {branding?.company_name || 'Cybaem Tech'}
          </span>
          <div className="w-px h-4 bg-white/[0.08] shrink-0" />
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shrink-0 ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
            <span className="text-white/40 text-xs font-medium hidden sm:block truncate max-w-[120px]">{userName}</span>
          </div>
          <div className="w-px h-4 bg-white/[0.08] mx-1" />
          <button onClick={() => setLocation('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white/30 hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition-all text-xs font-semibold">
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Portal</span>
          </button>
          {onProfileClick && (
            <button onClick={onProfileClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white/30 hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition-all text-xs font-semibold">
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </button>
          )}
          <button onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/[0.08] rounded-lg transition-all text-xs font-semibold">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
