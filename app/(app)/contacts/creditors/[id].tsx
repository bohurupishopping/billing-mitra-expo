import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Pressable } from 'react-native';
import { Text, Button, IconButton, Portal, Modal } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { Users, Trash2, IndianRupee, AlertCircle } from 'lucide-react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

interface Creditor {
  id: string;
  name: string;
  outstanding_amount: number;
  created_at: string;
}

interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference: string;
  bank_accounts: {
    name: string;
    account_type: string;
  } | null;
}

interface Purchase {
  id: string;
  purchase_number: string;
  purchase_date: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function CreditorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedBusiness } = useBusiness();
  const [creditor, setCreditor] = useState<Creditor | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (selectedBusiness && id) {
      fetchCreditorData();
    }
  }, [selectedBusiness, id]);

  const fetchCreditorData = async () => {
    if (!selectedBusiness || !id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch creditor details
      const { data: creditorData, error: creditorError } = await supabase
        .from('creditors')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();

      if (creditorError) throw creditorError;
      setCreditor(creditorData);

      // Fetch related payments
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          bank_accounts (
            name,
            account_type
          )
        `)
        .eq('creditor_id', id)
        .eq('business_id', selectedBusiness.id)
        .order('payment_date', { ascending: false });

      if (paymentError) throw paymentError;
      setPayments(paymentData || []);

      // Fetch related purchases
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .select('*')
        .eq('creditor_id', id)
        .eq('business_id', selectedBusiness.id)
        .order('purchase_date', { ascending: false });

      if (purchaseError) throw purchaseError;
      setPurchases(purchaseData || []);

    } catch (err: any) {
      console.error('Error fetching creditor data:', err);
      setError('Failed to load creditor information');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('creditors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      router.back();
    } catch (err: any) {
      console.error('Error deleting creditor:', err);
      setError('Failed to delete creditor');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!creditor) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Creditor not found</Text>
          <Button 
            mode="contained"
            onPress={() => router.back()}
            style={styles.emptyButton}
          >
            Back to Creditors
          </Button>
        </View>
      </View>
    );
  }

  const totalPurchases = purchases.reduce((sum, p) => sum + p.total_price, 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = totalPurchases - totalPayments;

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
            <View style={styles.titleIcon}>
              <Users size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.titleWrapper}>
              <Text style={styles.headerTitle}>{creditor.name}</Text>
              <Text style={styles.headerSubtitle}>Creditor Details</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon={() => <Trash2 size={20} color="#ffffff" />}
              onPress={() => setShowDeleteModal(true)}
            />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Financial Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Purchases</Text>
              <Text style={styles.statValue}>
                ₹{totalPurchases.toLocaleString()}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Payments</Text>
              <Text style={[styles.statValue, styles.statValueSuccess]}>
                ₹{totalPayments.toLocaleString()}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Outstanding</Text>
              <Text style={[styles.statValue, styles.statValueWarning]}>
                ₹{outstanding.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Payments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
            <Button
              mode="contained"
              onPress={() => router.push('/payments/new')}
              style={styles.sectionButton}
            >
              New Payment
            </Button>
          </View>
          {payments.length === 0 ? (
            <Text style={styles.emptyText}>No payments found</Text>
          ) : (
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Payment #</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Date</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Method</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Amount</Text>
              </View>
              {payments.slice(0, 5).map((payment) => (
                <Pressable
                  key={payment.id}
                  onPress={() => router.push(`/payments/${payment.id}`)}
                  style={({ pressed }) => [
                    styles.tableRow,
                    pressed && styles.tableRowPressed
                  ]}
                >
                  <Text style={[styles.tableCell, { flex: 1.2 }]} numberOfLines={1}>
                    {payment.payment_number}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>
                    {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.2 }]} numberOfLines={1}>
                    {payment.payment_method}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellAmount, { flex: 0.8 }]}>
                    ₹{payment.amount.toLocaleString()}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Recent Purchases */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Purchases</Text>
            <Button
              mode="contained"
              onPress={() => router.push('/purchases/new')}
              style={styles.sectionButton}
            >
              New Purchase
            </Button>
          </View>
          {purchases.length === 0 ? (
            <Text style={styles.emptyText}>No purchases found</Text>
          ) : (
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Item</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Date</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.6 }]}>Qty</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Total</Text>
              </View>
              {purchases.slice(0, 5).map((purchase) => (
                <Pressable
                  key={purchase.id}
                  onPress={() => router.push(`/purchases/${purchase.id}`)}
                  style={({ pressed }) => [
                    styles.tableRow,
                    pressed && styles.tableRowPressed
                  ]}
                >
                  <Text style={[styles.tableCell, { flex: 1.2 }]} numberOfLines={1}>
                    {purchase.item_name}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>
                    {format(new Date(purchase.purchase_date), 'MMM dd, yyyy')}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 0.6 }]}>
                    {purchase.quantity}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellAmount, { flex: 0.8 }]}>
                    ₹{purchase.total_price.toLocaleString()}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={showDeleteModal}
          onDismiss={() => setShowDeleteModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Delete Creditor</Text>
          <Text style={styles.modalDescription}>
            Are you sure you want to delete {creditor.name}? This action cannot be undone.
          </Text>
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowDeleteModal(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleDelete}
              style={[styles.modalButton, styles.modalButtonDelete]}
            >
              Delete
            </Button>
          </View>
        </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  content: {
    flex: 1,
    padding: 16,
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
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#4f46e5',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fee2e2',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  sectionButton: {
    backgroundColor: '#4f46e5',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  statValueSuccess: {
    color: '#059669',
  },
  statValueWarning: {
    color: '#d97706',
  },
  tableContainer: {
    gap: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tableRowPressed: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 14,
    color: '#1e293b',
  },
  tableCellAmount: {
    fontWeight: '600',
    color: '#4f46e5',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#ffffff',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    minWidth: 100,
  },
  modalButtonDelete: {
    backgroundColor: '#ef4444',
  },
}); 