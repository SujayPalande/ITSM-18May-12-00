import { useAuth } from '../contexts/AuthContext';
import { useCompanyBranding } from '../contexts/CompanyBrandingContext';
import { LogOut, User, Home, Zap } from 'lucide-react';
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

  const roleConfig: Record<string, { color: string; bg: string; label: string; dotClass: string }> = {
    admin:    { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', label: 'Administrator',  dotClass: 'bg-violet-400' },
    engineer: { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  label: 'Field Engineer', dotClass: 'bg-blue-400' },
    hr:       { color: '#34d399', bg: 'rgba(52,211,153,0.15)',  label: 'HR Manager',     dotClass: 'bg-emerald-400' },
    client:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  label: 'Client Portal',  dotClass: 'bg-amber-400' },
  };

  const config = roleConfig[normalizedRole] || roleConfig.engineer;

  return (
    <header className="bg-slate-950 border-b border-white/[0.06] sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-8 h-14 flex items-center justify-between gap-4">

        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: config.color }}
          >
            <Zap className="w-3.5 h-3.5 text-slate-950" />
          </div>
          <span className="text-white font-semibold text-[13px] tracking-tight hidden sm:block truncate">
            {branding?.company_name || 'Cybaem Tech'}
          </span>
          <div className="w-px h-4 bg-white/10 shrink-0" />
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shrink-0"
            style={{ color: config.color, backgroundColor: config.bg }}
          >
            {config.label}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 mr-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${config.dotClass}`} />
            <span className="text-white/60 text-[12px] font-medium hidden sm:block truncate max-w-[120px]">{userName}</span>
          </div>
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          <button
            onClick={() => setLocation('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white/50 hover:text-white hover:bg-white/[0.07] rounded-lg transition-all text-[12px] font-medium"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Main Portal</span>
          </button>
          {onProfileClick && (
            <button
              onClick={onProfileClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white/50 hover:text-white hover:bg-white/[0.07] rounded-lg transition-all text-[12px] font-medium"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </button>
          )}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-[12px] font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
