import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Image } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { router } from 'expo-router';
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

export default function NewAccountScreen() {
  const { selectedBusiness } = useBusiness();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    accountNumber: '',
    accountType: 'checking',
    openingBalance: '0',
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);

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
    if (!validateForm() || !selectedBusiness) return;
    
    setLoading(true);
    
    try {
      const openingBalance = parseFloat(formData.openingBalance);
      
      const { error } = await supabase
        .from('bank_accounts')
        .insert({
          business_id: selectedBusiness.id,
          name: formData.name,
          account_number: formData.accountNumber || null,
          account_type: formData.accountType,
          opening_balance: openingBalance,
          current_balance: openingBalance,
        });
        
      if (error) throw error;
      
      router.back();
    } catch (err: any) {
      console.error('Error creating account:', err);
      setErrors(prev => ({ ...prev, submit: 'Failed to create account' }));
    } finally {
      setLoading(false);
    }
  };

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
        <Text variant="titleLarge" style={styles.title}>New Account</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Add a new bank or cash account
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
            Create Account
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
    marginBottom: 16,
    backgroundColor: '#ffffff',
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