import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, TextInput } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { Users, AtSign, Phone, MapPin, IndianRupee, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  outstandingAmount: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  outstandingAmount?: string;
  submit?: string;
}

interface Creditor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  outstanding_amount: number;
}

export default function EditCreditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedBusiness } = useBusiness();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    outstandingAmount: '0.00',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (selectedBusiness && id) {
      fetchCreditor();
    }
  }, [selectedBusiness, id]);

  const fetchCreditor = async () => {
    if (!selectedBusiness || !id) return;

    setFetchLoading(true);

    try {
      const { data, error } = await supabase
        .from('creditors')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          outstandingAmount: data.outstanding_amount?.toString() || '0.00',
        });
      } else {
        router.back();
      }
    } catch (err: any) {
      console.error('Error fetching creditor:', err);
      setErrors(prev => ({
        ...prev,
        submit: 'Failed to load creditor information'
      }));
      router.back();
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email address is invalid';
    }

    if (formData.outstandingAmount) {
      const amount = parseFloat(formData.outstandingAmount);
      if (isNaN(amount) || amount < 0) {
        newErrors.outstandingAmount = 'Outstanding amount must be a valid positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedBusiness || !id) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('creditors')
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          outstanding_amount: parseFloat(formData.outstandingAmount) || 0
        })
        .eq('id', id)
        .eq('business_id', selectedBusiness.id);

      if (error) throw error;
      router.back();
    } catch (err: any) {
      console.error('Error updating creditor:', err);
      setErrors(prev => ({
        ...prev,
        submit: 'Failed to update creditor. Please try again.'
      }));
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!selectedBusiness) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Business Selected</Text>
          <Text style={styles.emptySubtitle}>
            Please select a business to edit a creditor
          </Text>
          <Button 
            mode="contained"
            onPress={() => router.push('/businesses')}
            style={styles.emptyButton}
          >
            Select Business
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4f46e5', '#4338ca']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <IconButton
              icon={() => <ArrowLeft size={24} color="#ffffff" />}
              onPress={() => router.back()}
              style={styles.backButton}
            />
            <View style={styles.titleWrapper}>
              <Text style={styles.headerTitle}>Edit Creditor</Text>
              <Text style={styles.headerSubtitle}>Update creditor details</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          {/* Name Field */}
          <View style={styles.field}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={[
                styles.input,
                errors.name && styles.inputError
              ]}
              value={formData.name}
              onChangeText={(value) => handleChange('name', value)}
              placeholder="Individual or Company Name"
              placeholderTextColor="#94a3b8"
            />
            {errors.name && (
              <Text style={styles.errorText}>{errors.name}</Text>
            )}
          </View>

          {/* Email Field */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <AtSign size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={[
                  styles.input,
                  styles.inputWithIcon,
                  errors.email && styles.inputError
                ]}
                value={formData.email}
                onChangeText={(value) => handleChange('email', value)}
                placeholder="contact@example.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Phone Field */}
          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            <View style={styles.inputContainer}>
              <Phone size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                value={formData.phone}
                onChangeText={(value) => handleChange('phone', value)}
                placeholder="+91 1234567890"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Address Field */}
          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            <View style={styles.inputContainer}>
              <MapPin size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                value={formData.address}
                onChangeText={(value) => handleChange('address', value)}
                placeholder="123 Main St, City, State, PIN"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Outstanding Amount Field */}
          <View style={styles.field}>
            <Text style={styles.label}>Outstanding Amount</Text>
            <View style={styles.inputContainer}>
              <IndianRupee size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={[
                  styles.input,
                  styles.inputWithIcon,
                  errors.outstandingAmount && styles.inputError
                ]}
                value={formData.outstandingAmount}
                onChangeText={(value) => handleChange('outstandingAmount', value)}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
              />
            </View>
            {errors.outstandingAmount && (
              <Text style={styles.errorText}>{errors.outstandingAmount}</Text>
            )}
          </View>

          {errors.submit && (
            <Text style={styles.submitError}>{errors.submit}</Text>
          )}

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
            >
              Save Changes
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 48 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    margin: 0,
    marginRight: 8,
  },
  titleWrapper: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#e0e7ff',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#1e293b',
  },
  inputWithIcon: {
    height: 44,
    paddingLeft: 0,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  submitError: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    minWidth: 100,
  },
  submitButton: {
    minWidth: 140,
    backgroundColor: '#4f46e5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#4f46e5',
  },
}); 