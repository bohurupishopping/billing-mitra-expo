import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export type Business = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  logo_url: string | null;
  created_at: string;
};

type BusinessContextType = {
  businesses: Business[];
  selectedBusiness: Business | null;
  loading: boolean;
  error: string | null;
  fetchBusinesses: () => Promise<void>;
  selectBusiness: (business: Business) => Promise<void>;
  createBusiness: (data: Omit<Business, 'id' | 'created_at'>) => Promise<Business>;
};

const SELECTED_BUSINESS_KEY = '@business:selected';

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load selected business from storage on mount
  useEffect(() => {
    loadSelectedBusiness();
  }, []);

  // Fetch businesses when session changes
  useEffect(() => {
    if (session) {
      fetchBusinesses();
    }
  }, [session]);

  const loadSelectedBusiness = async () => {
    try {
      const storedData = await AsyncStorage.getItem(SELECTED_BUSINESS_KEY);
      if (storedData) {
       let parsedData;
         if (storedData.trim().startsWith('{')) {
           parsedData = JSON.parse(storedData);
         } else {
           parsedData = { id: storedData, expiry: null };
         }
         const { id, expiry } = parsedData;
         if (expiry && new Date(expiry) > new Date()) {
  
        const { data: business } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', id)
  
          .single();
          
if (business) {
            setSelectedBusiness(business);
          }
        } else {
          await AsyncStorage.removeItem(SELECTED_BUSINESS_KEY);
        }
      }
    } catch (err) {
      console.error('Error loading selected business:', err);
    }
  };

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBusinesses(data);

      // If no business is selected and we have businesses, select the first one
      if (!selectedBusiness && data.length > 0) {
        await selectBusiness(data[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectBusiness = async (business: Business) => {
    try {
      const dataToStore = JSON.stringify({
        id: business.id,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      await AsyncStorage.setItem(SELECTED_BUSINESS_KEY, dataToStore);
      setSelectedBusiness(business);
    } catch (err) {
      console.error('Error saving selected business:', err);
    }
  };

  const createBusiness = async (data: Omit<Business, 'id' | 'created_at'>) => {
    try {
      setError(null);
      const { data: newBusiness, error } = await supabase
        .from('businesses')
        .insert([{ ...data, owner_id: session?.user?.id }])
        .select()
        .single();

      if (error) throw error;

      setBusinesses(prev => [newBusiness, ...prev]);
      await selectBusiness(newBusiness);
      return newBusiness;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        selectedBusiness,
        loading,
        error,
        fetchBusinesses,
        selectBusiness,
        createBusiness,
      }}>
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};