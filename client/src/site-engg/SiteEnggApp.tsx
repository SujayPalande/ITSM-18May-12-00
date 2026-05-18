import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyBrandingProvider } from './contexts/CompanyBrandingContext';
import Header from './components/Header';
import ProfileEditor from './components/ProfileEditor';
import { Monitor, Smartphone } from 'lucide-react';
import EngineerDashboard from './components/dashboards/EngineerDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import HRDashboard from './components/dashboards/HRDashboard';
import ClientDashboard from './components/dashboards/ClientDashboard';
import MobileEngineerDashboard from './components/mobile/MobileEngineerDashboard';
import MobileHRDashboard from './components/mobile/MobileHRDashboard';
import MobileAdminDashboard from './components/mobile/MobileAdminDashboard';
import MobileClientDashboard from './components/mobile/MobileClientDashboard';

function AppContent() {
  const { user, loading } = useAuth();
  const [viewMode, setViewMode] = useState<'web' | 'mobile'>('web');
  const [multiRoleViewMode, setMultiRoleViewMode] = useState<'admin' | 'hr' | 'engineer' | 'client'>('admin');
  const [showProfile, setShowProfile] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-50 min-h-screen flex items-center justify-center text-sm">
        Please log in through the main portal.
      </div>
    );
  }

  const roleStr = Array.isArray(user.role) ? user.role.join(',') : String(user.role || '');
  const normalizedRole = roleStr.toLowerCase();

  const isPrivilegedUser = user.email.toLowerCase() === 'rohan@cybaemtech.com' ||
                           user.email.toLowerCase() === 'shivam.jagtap@cybaemtech.com';

  const effectiveRole = (isPrivilegedUser ? multiRoleViewMode : normalizedRole) || '';

  const isHR = effectiveRole.includes('hr');
  const isAdmin = effectiveRole.includes('admin');
  const isClient = effectiveRole.includes('client');
  const isEngineer = effectiveRole.includes('engineer');
  const isPrivileged = isHR || isAdmin;

  const renderDashboard = () => {
    if (viewMode === 'mobile') {
      if (isAdmin)    return <MobileAdminDashboard />;
      if (isEngineer) return <MobileEngineerDashboard />;
      if (isHR)       return <MobileHRDashboard />;
      if (isClient)   return <MobileClientDashboard />;
    }
    if (isAdmin)    return <AdminDashboard />;
    if (isEngineer) return <EngineerDashboard />;
    if (isHR)       return <HRDashboard />;
    if (isClient)   return <ClientDashboard />;
    return <EngineerDashboard />;
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Header
        currentRole={user.role}
        userName={user.name || 'User'}
        onProfileClick={() => setShowProfile(true)}
      />

      {/* View / role switcher — pinned top-right, below header, never overlaps content */}
      {(isEngineer || isPrivileged || isClient) && (
        <div className="fixed top-[3.75rem] right-0 z-40 flex flex-col items-end gap-1 px-3 py-2 bg-white/90 backdrop-blur-md border-b border-l border-slate-100 rounded-bl-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mr-1">View</span>
            <button
              onClick={() => setViewMode('web')}
              title="Web View"
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                viewMode === 'web'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              title="Mobile View"
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                viewMode === 'mobile'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>

            {isPrivilegedUser && (
              <>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                {(['admin', 'hr', 'client', 'engineer'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setMultiRoleViewMode(role)}
                    className={`py-1 px-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                      multiRoleViewMode === role
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <main className="min-h-[calc(100vh-3.5rem)]">
        {showProfile ? (
          <div className="max-w-4xl mx-auto px-5 lg:px-8 py-6">
            <ProfileEditor onClose={() => setShowProfile(false)} />
          </div>
        ) : (
          renderDashboard()
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CompanyBrandingProvider>
        <AppContent />
      </CompanyBrandingProvider>
    </AuthProvider>
  );
}

export default App;
