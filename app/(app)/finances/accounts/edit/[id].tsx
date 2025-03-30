import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Image } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { IndianRupee } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type FormData = {
  name: string;
  accountNumber: string;
  accountType: string;
  openingBalance: string;
};

type BankAccount = {
  id: string;
  name: string;
  account_number: string | null;
  account_type: string;
  opening_balance: number;
  current_balance: number;
};

export default function EditAccountScreen() {
  const { id } = useLocalSearchParams();
  const { selectedBusiness } = useBusiness();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    accountNumber: '',
    accountType: '',
    openingBalance: '',
  });
  
  const [originalAccount, setOriginalAccount] = useState<BankAccount | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (selectedBusiness && id) {
      fetchAccount();
    }
  }, [selectedBusiness, id]);

  const fetchAccount = async () => {
    if (!selectedBusiness || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setOriginalAccount(data);
        setFormData({
          name: data.name,
          accountNumber: data.account_number || '',
          accountType: data.account_type,
          openingBalance: data.opening_balance.toString(),
        });
      } else {
        router.back();
      }
    } catch (err) {
      console.error('Error fetching account:', err);
      router.back();
    } finally {
      setFetchLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
    }
    
    if (!formData.accountType.trim()) {
      newErrors.accountType = 'Account type is required';
    }
    
    if (!formData.openingBalance.trim()) {
      newErrors.openingBalance = 'Opening balance is required';
    } else {
      const balance = parseFloat(formData.openingBalance);
      if (isNaN(balance)) {
        newErrors.openingBalance = 'Opening balance must be a number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedBusiness || !id || !originalAccount) return;
    
    setLoading(true);
    
    try {
      const openingBalance = parseFloat(formData.openingBalance);
      const balanceDifference = openingBalance - originalAccount.opening_balance;
      
      const { error } = await supabase
        .from('bank_accounts')
        .update({
          name: formData.name,
          account_number: formData.accountNumber || null,
          account_type: formData.accountType,
          opening_balance: openingBalance,
          current_balance: originalAccount.current_balance + balanceDifference,
        })
        .eq('id', id)
        .eq('business_id', selectedBusiness.id);
        
      if (error) throw error;
      
      router.back();
    } catch (err: any) {
      console.error('Error updating account:', err);
      setErrors(prev => ({ ...prev, submit: 'Failed to update account' }));
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading account details...</Text>
        </View>
      </View>
    );
  }

  const HeaderBackground = Platform.select({
    web: () => (
      <img
        src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.9,
          filter: 'blur(70px)'
        }}
        alt="Background"
      />
    ),
    default: () => (
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80' }}
        style={[StyleSheet.absoluteFillObject, { opacity: 0.9 }]}
        blurRadius={70}
      />
    )
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <HeaderBackground />
        <Text variant="titleLarge" style={styles.title}>Edit Account</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Update account information
        </Text>
      </View>

      <View style={styles.form}>
        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <TextInput
            mode="outlined"
            label="Account Name"
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            error={!!errors.name}
            style={styles.input}
          />
          {errors.name && (
            <HelperText type="error">{errors.name}</HelperText>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <TextInput
            mode="outlined"
            label="Account Number (Optional)"
            value={formData.accountNumber}
            onChangeText={(text) => setFormData(prev => ({ ...prev, accountNumber: text }))}
            style={styles.input}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(300)}>
          <TextInput
            mode="outlined"
            label="Account Type"
            value={formData.accountType}
            onChangeText={(text) => setFormData(prev => ({ ...prev, accountType: text }))}
            error={!!errors.accountType}
            style={styles.input}
          />
          {errors.accountType && (
            <HelperText type="error">{errors.accountType}</HelperText>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(400)}>
          <TextInput
            mode="outlined"
            label="Opening Balance"
            value={formData.openingBalance}
            onChangeText={(text) => setFormData(prev => ({ ...prev, openingBalance: text }))}
            error={!!errors.openingBalance}
            keyboardType="numeric"
            left={<TextInput.Icon icon={() => <IndianRupee size={20} color="#64748b" />} />}
            style={styles.input}
          />
          {errors.openingBalance && (
            <HelperText type="error">{errors.openingBalance}</HelperText>
          )}
          <Text style={styles.helperText}>
            Note: Changing the opening balance will affect the current balance
          </Text>
        </Animated.View>

        {errors.submit && (
          <Text style={styles.errorText}>{errors.submit}</Text>
        )}

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => router.back()}
            style={styles.button}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Save Changes
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    backgroundColor: '#4f46e5',
    height: 180,
  },
  title: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#e0e7ff',
  },
  form: {
    padding: 16,
    marginTop: -48,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: -4,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  button: {
    minWidth: 120,
  },
});