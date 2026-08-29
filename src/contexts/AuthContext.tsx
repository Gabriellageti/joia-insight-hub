import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { purgeSensitiveBrowserState } from '@/lib/session-security';
import {
  AppRole,
  AuthorizationPermission,
  isAllowed,
  WorkspaceRole,
} from '@/lib/authorization';

export interface WorkspaceMembership {
  workspaceId: string;
  role: WorkspaceRole;
  isDefault: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authorizationLoading: boolean;
  authorizationError: string | null;
  memberships: WorkspaceMembership[];
  activeMembership: WorkspaceMembership | null;
  appRoles: AppRole[];
  roles: string[];
  isAdmin: boolean;
  can: (permission: AuthorizationPermission) => boolean;
  refreshAuthorization: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorizationLoading, setAuthorizationLoading] = useState(true);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [appRoles, setAppRoles] = useState<AppRole[]>([]);
  const authorizationRequest = useRef(0);

  const loadAuthorization = useCallback(async (userId: string | null) => {
    const requestId = ++authorizationRequest.current;
    if (!userId) {
      setMemberships([]);
      setAppRoles([]);
      setAuthorizationError(null);
      setAuthorizationLoading(false);
      return;
    }

    setAuthorizationLoading(true);
    const [membershipResult, roleResult] = await Promise.all([
      supabase
        .from('workspace_members')
        .select('workspace_id, role, is_default')
        .eq('user_id', userId)
        .order('is_default', { ascending: false }),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);

    if (requestId !== authorizationRequest.current) return;

    if (membershipResult.error || roleResult.error) {
      setMemberships([]);
      setAppRoles([]);
      setAuthorizationError('Não foi possível validar seu acesso ao workspace.');
    } else {
      setMemberships(
        membershipResult.data.map((membership) => ({
          workspaceId: membership.workspace_id,
          role: membership.role,
          isDefault: membership.is_default,
        })),
      );
      setAppRoles(roleResult.data.map(({ role }) => role));
      setAuthorizationError(null);
    }
    setAuthorizationLoading(false);
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') purgeSensitiveBrowserState();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        void loadAuthorization(session?.user.id ?? null);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      void loadAuthorization(session?.user.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [loadAuthorization]);

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.isDefault) ?? memberships[0] ?? null,
    [memberships],
  );

  const can = useCallback(
    (permission: AuthorizationPermission) => isAllowed(permission, activeMembership?.role, appRoles),
    [activeMembership?.role, appRoles],
  );

  const refreshAuthorization = useCallback(
    () => loadAuthorization(user?.id ?? null),
    [loadAuthorization, user?.id],
  );

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      purgeSensitiveBrowserState();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      authorizationLoading,
      authorizationError,
      memberships,
      activeMembership,
      appRoles,
      roles: appRoles,
      isAdmin: appRoles.includes('admin_joia'),
      can,
      refreshAuthorization,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
