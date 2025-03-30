import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, Platform } from 'react-native';
import { Text, Button, IconButton, Portal, Dialog } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Calendar, CreditCard, User, Trash2, CircleAlert as AlertCircle, Pencil, IndianRupee, Wallet, FileText, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

type Payment = {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  creditors: {
    id: string;
    name: string;
  } | null;
  bank_accounts: {
    id: string;
    name: string;
    account_type: string;
  } | null;
};

export default function PaymentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { selectedBusiness } = useBusiness();
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchPayment = async () => {
    if (!selectedBusiness || !id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, creditors(id, name), bank_accounts(id, name, account_type)')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (error) throw error;
      setPayment(data);
    } catch (err: any) {
      console.error('Error fetching payment:', err);
      setError('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness && id) {
      fetchPayment();
    }
  }, [selectedBusiness, id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPayment();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    try {
      // First delete related transaction if exists
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('reference_id', id)
        .eq('type', 'withdrawal');
      
      if (transactions && transactions.length > 0) {
        await supabase
          .from('transactions')
          .delete()
          .eq('reference_id', id);
      }

      // Then delete the payment
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      router.replace('/payments');
    } catch (err: any) {
      console.error('Error deleting payment:', err);
      setError('Failed to delete payment');
    }
  };

  if (loading && !payment) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading payment details...</Text>
        </View>
      </View>
    );
  }

  if (!payment) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#ef4444" />
          <Text style={styles.errorText}>Payment not found</Text>
          <Button mode="contained" onPress={() => router.back()}>
            Go Back
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
          <Button
            mode="text"
            onPress={() => router.back()}
            icon={() => <ArrowLeft size={20} color="#ffffff" />}
            textColor="#ffffff"
            style={styles.backButton}
          >
            Back
          </Button>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Payment Details</Text>
            <Text style={styles.headerSubtitle}>
              View payment information
            </Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon={() => <Pencil size={20} color="#ffffff" />}
              onPress={() => router.push(`/payments/edit/${id}`)}
              iconColor="#ffffff"
            />
            <IconButton
              icon={() => <Trash2 size={20} color="#ffffff" />}
              onPress={() => setShowDeleteDialog(true)}
              iconColor="#ffffff"
            />
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <CreditCard size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Payment Number</Text>
              <Text style={styles.statValue}>{payment.payment_number}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <IndianRupee size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Amount</Text>
              <Text style={styles.statValue}>₹{payment.amount}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Calendar size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Payment Date</Text>
              <Text style={styles.statValue}>
                {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading payment details...</Text>
          </View>
        ) : !payment ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={48} color="#ef4444" />
            <Text style={styles.emptyText}>Payment not found</Text>
            <Button mode="contained" onPress={() => router.back()}>
              Go Back
            </Button>
          </View>
        ) : (
          <Animated.View 
            entering={FadeInDown.duration(300).delay(100)}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <Text style={styles.sectionValue}>
                {payment.payment_method === 'Bank Transfer' && payment.bank_accounts
                  ? `Bank Transfer - ${payment.bank_accounts.name} (${payment.bank_accounts.account_type})`
                  : payment.payment_method}
              </Text>
            </View>
          </Animated.View>
        )}

        {payment.creditors && (
          <Animated.View entering={FadeInDown.duration(300).delay(200)}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Paid To</Text>
              <Text style={styles.sectionValue}>{payment.creditors.name}</Text>
            </View>
          </Animated.View>
        )}

        {payment.reference && (
          <Animated.View entering={FadeInDown.duration(300).delay(300)}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reference</Text>
              <Text style={styles.sectionValue}>{payment.reference}</Text>
            </View>
          </Animated.View>
        )}

        {payment.notes && (
          <Animated.View entering={FadeInDown.duration(300).delay(400)}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.sectionValue}>{payment.notes}</Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Payment</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete this payment? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onPress={handleDelete} textColor="#ef4444">Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {
    gap: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#e0e7ff',
    opacity: 0.8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
});