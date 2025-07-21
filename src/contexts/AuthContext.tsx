import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userPermissions: string[];
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserPermissions(session.user);
        checkAdminStatus(session.user);
      }
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserPermissions(session.user);
        checkAdminStatus(session.user);
      } else {
        setUserPermissions([]);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  function checkAdminStatus(user: User) {
    setIsAdmin(user.email === 'admin@reforpan.com');
  }

  async function fetchUserPermissions(user: User) {
    if (user.email === 'admin@reforpan.com') {
      // Admin has all permissions
      setUserPermissions(['dashboard', 'production-diary', 'products', 'formulation', 'separation', 'users', 'tech-planning', 'graphics', 'reports']);
      return;
    }

    try {
      const { data: permissions, error } = await supabase
        .from('user_permissions')
        .select('module')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching permissions:', error);
        setUserPermissions([]);
        return;
      }

      setUserPermissions(permissions?.map(p => p.module) || []);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      setUserPermissions([]);
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    loading,
    userPermissions,
    isAdmin,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}