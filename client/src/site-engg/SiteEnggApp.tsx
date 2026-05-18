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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-[13px] font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="p-8 text-center text-red-400/70 bg-[#F8FAFC] min-h-screen flex items-center justify-center text-sm">Please log in through the main portal.</div>;
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
        if (isAdmin)      return <MobileAdminDashboard />;
        if (isEngineer)   return <MobileEngineerDashboard />;
        if (isHR)         return <MobileHRDashboard />;
        if (isClient)     return <MobileClientDashboard />;
    }

    if (isAdmin) return <AdminDashboard />;
    if (isEngineer) return <EngineerDashboard />;
    if (isHR) return <HRDashboard />;
    if (isClient) return <ClientDashboard />;
    
    return <EngineerDashboard />;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative">
      <Header
        currentRole={user.role}
        userName={user.name || 'User'}
        onProfileClick={() => setShowProfile(true)}
      />

      {/* Floating view toggle */}
      {(isEngineer || isPrivileged || isClient) && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-xl border border-slate-200 p-1.5 flex gap-1 shadow-xl shadow-slate-200 border-none">
            <button
              onClick={() => setViewMode('web')}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                viewMode === 'web'
                  ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.1)]'
                  : 'text-slate-500 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="Web View"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                viewMode === 'mobile'
                  ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.1)]'
                  : 'text-slate-500 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
          {isPrivilegedUser && (
            <div className="bg-white/90 backdrop-blur-xl mt-2 rounded-xl border border-slate-200 p-1.5 flex flex-col gap-1 shadow-xl shadow-slate-200 border-none">
              <div className="flex gap-1">
                {(['admin', 'hr'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setMultiRoleViewMode(role)}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-semibold uppercase tracking-[0.05em] transition-all duration-200 ${
                      multiRoleViewMode === role
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-slate-500 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {(['client', 'engineer'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setMultiRoleViewMode(role)}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-semibold uppercase tracking-[0.05em] transition-all duration-200 ${
                      multiRoleViewMode === role
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-slate-500 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <main className="min-h-[calc(100vh-3.5rem)]">
        {showProfile ? (
          <div className="p-6">
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
