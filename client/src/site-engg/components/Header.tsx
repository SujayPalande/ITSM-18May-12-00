import { useAuth } from '../contexts/AuthContext';
import { useCompanyBranding } from '../contexts/CompanyBrandingContext';
import { LogOut, User, Home, ChevronRight, Zap } from 'lucide-react';
import { useLocation } from 'wouter';

interface HeaderProps {
  currentRole: string;
  userName: string;
  onProfileClick?: () => void;
}

export default function Header({ currentRole, userName, onProfileClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { branding } = useCompanyBranding();

  function handleSignOut() {
    signOut();
  }

  const normalizedRole = currentRole.toLowerCase().trim();

  const roleConfig: Record<string, { accent: string; glow: string; label: string }> = {
    admin:    { accent: '#A78BFA', glow: 'shadow-[0_0_12px_rgba(167,139,250,0.15)]', label: 'Administrator' },
    engineer: { accent: '#34D399', glow: 'shadow-[0_0_12px_rgba(52,211,153,0.15)]', label: 'Field Engineer' },
    hr:       { accent: '#60A5FA', glow: 'shadow-[0_0_12px_rgba(96,165,250,0.15)]', label: 'HR Manager' },
    client:   { accent: '#FBBF24', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.15)]', label: 'Client' },
  };

  const config = roleConfig[normalizedRole] || roleConfig.engineer;

  return (
    <header className="bg-white/95 backdrop-blur-2xl border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-8 py-3">
        <div className="flex justify-between items-center">
          {/* Left: Identity */}
          <div className="flex items-center gap-3.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-slate-900 ${config.glow} ring-1 ring-slate-200`}
              style={{ background: branding ? branding.primary_color : config.accent }}
            >
              <span className="text-[13px] font-semibold">{userName.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 leading-none text-[13px] tracking-[-0.01em]">{userName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="px-2 py-[2px] rounded text-[9px] font-bold uppercase tracking-[0.08em] border border-slate-200 bg-slate-100 text-slate-600"
                  style={{ color: config.accent }}
                >
                  {config.label}
                </span>
                {user?.portalRole && user.portalRole.toLowerCase() !== normalizedRole && (
                  <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-[1px] rounded">ITSM: {user.portalRole}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLocation('/')}
              className="flex items-center gap-1.5 px-3 py-[7px] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200 text-[12px] font-medium group"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Main Portal</span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50 -ml-0.5 group-hover:translate-x-0.5 transition-all hidden sm:block" />
            </button>
            {onProfileClick && (
              <button
                onClick={onProfileClick}
                className="flex items-center gap-1.5 px-3 py-[7px] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200 text-[12px] font-medium"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">My Profile</span>
              </button>
            )}
            <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-[7px] text-slate-600 hover:text-red-400 hover:bg-red-500/[0.06] rounded-lg transition-all duration-200 text-[12px] font-medium group"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
