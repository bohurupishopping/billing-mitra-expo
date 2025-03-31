import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

if (!SUPABASE_URL) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL is required');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY is required');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'supabase.auth.token',
    storage: {
      getItem: async (key) => {
        try {
          return await AsyncStorage.getItem(key);
        } catch (error) {
          console.error('Error getting item from storage:', error);
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          return await AsyncStorage.setItem(key, value);
        } catch (error) {
          console.error('Error setting item in storage:', error);
        }
      },
      removeItem: async (key) => {
        try {
          return await AsyncStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing item from storage:', error);
        }
      },
    },
  },
});

// No need to manually set session - the storage configuration above
// will handle persistence automatically