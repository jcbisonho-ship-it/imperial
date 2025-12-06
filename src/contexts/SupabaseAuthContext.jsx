import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({});

  const fetchPermissions = useCallback(async () => {
    const { data, error } = await supabase.from('permissions').select('*');
    if (error) {
      console.error('Error fetching permissions:', error);
      return {};
    }
    const perms = {};
    data.forEach(p => {
      if (!perms[p.role]) perms[p.role] = {};
      perms[p.role][p.module] = {
        view: p.can_view,
        create: p.can_create,
        edit: p.can_edit,
        delete: p.can_delete,
        export: p.can_export,
      };
    });
    setPermissions(perms);
    return perms;
  }, []);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    setUser(session?.user ?? null);
    if (session) {
      await fetchPermissions();
    }
    setLoading(false);
  }, [fetchPermissions]);

  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    };
    getSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleSession(session);
    });
    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signUp = useCallback(async ({ email, password, options }) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options });
    if (error && error.message.includes('User already registered')) {
        return { data, error, userAlreadyExists: true };
    }
    return { data, error, userAlreadyExists: false };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
    }
    return { data, error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
    }
    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    permissions,
    fetchPermissions,
    signUp,
    signIn,
    signOut,
  }), [user, session, loading, permissions, fetchPermissions, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};