import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage key for auth session
const AUTH_SESSION_KEY = '@auth:session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  // Load session from storage on mount
  useEffect(() => {
    const loadPersistedSession = async () => {
      try {
        // Set up mounted ref
        mounted.current = true;
        
        // Try to get session from storage first
        const storedSessionStr = await AsyncStorage.getItem(AUTH_SESSION_KEY);
        let storedSession = null;
        
        if (storedSessionStr) {
          storedSession = JSON.parse(storedSessionStr);
          // If we have a stored session, set it immediately to avoid flash of login screen
          if (mounted.current && storedSession) {
            setSession(storedSession);
          }
        }
        
        // Get fresh session from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted.current) {
          setSession(session);
          
          // Store the fresh session
          if (session) {
            await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
          } else if (storedSessionStr) {
            // If we had a stored session but now it's gone, remove it from storage
            await AsyncStorage.removeItem(AUTH_SESSION_KEY);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading auth session:', error);
        if (mounted.current) {
          setLoading(false);
        }
      }
    };
    
    loadPersistedSession();
    
    // Set up auth subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted.current) {
        setSession(session);
        
        // Update stored session
        if (session) {
          await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
        } else {
          await AsyncStorage.removeItem(AUTH_SESSION_KEY);
        }
      }
    });
    
    // Cleanup function
    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};