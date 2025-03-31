import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Use SecureStore on native platforms, AsyncStorage on web
const storage = Platform.OS === 'web' ? AsyncStorage : {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};


if (!SUPABASE_URL) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL is required');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY is required');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage, // Use the conditional storage defined above
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// No need to manually set session - the storage configuration above
// will handle persistence automatically
