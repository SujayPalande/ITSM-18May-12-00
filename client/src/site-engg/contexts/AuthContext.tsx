import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useAuth as useMainAuth } from '@/hooks/use-auth';

// We map the main ITSM user to the Site Engg expected User shape
export function AuthProvider({ children }: { children: ReactNode }) {
  // We don't actually need to provide anything new, since useMainAuth uses TanStack Query
  // which is already provided at the root App level.
  return <>{children}</>;
}

export function useAuth() {
  const { user: mainUser, isLoading, logoutMutation } = useMainAuth();

  // Map ITSM role to Site Engg role (fallback mechanism)
  function mapRole(itsmRole: any): string {
    const r = (Array.isArray(itsmRole) ? itsmRole.join(',') : String(itsmRole || '')).toLowerCase();
    if (r.includes('admin')) return 'admin';
    if (r.includes('hr')) return 'hr';
    // ITSM 'agent' = Site Engg 'engineer'
    if (r.includes('agent')) return 'engineer';
    if (r.indexOf('user') !== -1 || r.indexOf('client') !== -1) return 'client';
    return 'client'; // default for unknown
  }

  // Map ITSM user to Site Engg User shape - Memoize to prevent infinite re-renders
  const mappedUser = useMemo(() => {
    if (!mainUser) return null;
    
    // 💡 SOURCE OF TRUTH: If seRole is provided from backend (synced from se_profiles), 
    // we use it as the definitive role for Site Engineering.
    const enggRole = (mainUser as any).seRole || mapRole(mainUser.role);
    
    return {
      id: mainUser.id.toString(),
      email: mainUser.email || '',
      name: mainUser.name || mainUser.username || '',
      role: enggRole,
      portalRole: Array.isArray(mainUser.role) ? mainUser.role.join(', ') : String(mainUser.role),
      department: mainUser.department,
      engineerId: (mainUser as any).engineerId,
      clientId: (mainUser as any).seClientId || null,
    };
  }, [mainUser]);

  return {
    user: mappedUser,
    loading: isLoading,
    configError: null,
    signIn: async () => { throw new Error('Use main login page'); },
    signOut: async () => { logoutMutation.mutate(); },
    resetPassword: async () => { throw new Error('Use main portal'); }
  };
}
