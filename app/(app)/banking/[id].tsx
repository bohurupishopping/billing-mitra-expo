import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, Platform, Pressable } from 'react-native';
import { Text, Button, IconButton, Portal, Modal } from 'react-native-paper';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { getBankAccount, BankAccount } from '../../lib/api/bank-accounts';
import { getTransactions, Transaction } from '../../lib/api/transactions';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertCircle, 
  Calendar, 
  Pencil, 
  RefreshCw, 
  Download,
  IndianRupee,
  Trash2
} from 'lucide-react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

const { width } = Dimensions.get('window');
const isTablet = width > 768;

// Currency formatting function
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function BankAccountDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedBusiness } = useBusiness();

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchData = async () => {
    if (!selectedBusiness || !id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch account details
      const accountResponse = await getBankAccount(id, selectedBusiness.id);
      if (accountResponse.error) throw new Error(accountResponse.error);
      setAccount(accountResponse.data);

      // Fetch transactions
      const transactionsResponse = await getTransactions(id, selectedBusiness.id);
      if (transactionsResponse.error) throw new Error(transactionsResponse.error);
      setTransactions(transactionsResponse.data || []);
    } catch (err: any) {
      console.error('Error fetching account data:', err);
      setError(err.message || 'Failed to load account information');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness && id) {
      fetchData();
    }
  }, [selectedBusiness, id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      // Add delete account API call here
      router.back();
    } catch (err: any) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account');
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'checking':
        return <CreditCard size={20} color="#3B82F6" />;
      case 'savings':
        return <CreditCard size={20} color="#10B981" />;
      case 'credit card':
        return <CreditCard size={20} color="#8B5CF6" />;
      case 'cash':
        return <CreditCard size={20} color="#EAB308" />;
      default:
        return <CreditCard size={20} color="#6B7280" />;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownRight size={16} color="#059669" />;
      case 'withdrawal':
        return <ArrowUpRight size={16} color="#DC2626" />;
      case 'transfer':
        return <RefreshCw size={16} color="#2563EB" />;
      default:
        return <ArrowDownRight size={16} color="#6B7280" />;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!account) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Account not found.</Text>
          <Button 
            mode="contained"
            onPress={() => router.back()}
            style={styles.emptyButton}
          >
            Back to Accounts
          </Button>
        </View>
      </View>
    );
  }

  const totalDeposits = transactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalTransfers = transactions
    .filter(t => t.type === 'transfer')
    .reduce((sum, t) => sum + Number(t.amount), 0);

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
              {getAccountTypeIcon(account.account_type)}
            </View>
            <View style={styles.titleWrapper}>
              <Text style={styles.headerTitle}>{account.name}</Text>
              <Text style={styles.headerSubtitle}>{account.account_type}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon={() => <Pencil size={20} color="#ffffff" />}
              onPress={() => router.push(`/banking/${id}/edit` as any)}
            />
            <IconButton
              icon={() => <Trash2 size={20} color="#ffffff" />}
              onPress={() => setShowDeleteModal(true)}
            />
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <IndianRupee size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Current Balance</Text>
              <Text style={styles.statValue}>{formatCurrency(Number(account.current_balance))}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Calendar size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Created</Text>
              <Text style={styles.statValue}>{format(new Date(account.created_at), 'MMM dd, yyyy')}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4f46e5"
            colors={['#4f46e5']}
            progressBackgroundColor="#ffffff"
          />
        }
      >
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
              <Text style={styles.statLabel}>Total Deposits</Text>
              <Text style={[styles.statValue, styles.statValueSuccess]}>
                {formatCurrency(totalDeposits)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Withdrawals</Text>
              <Text style={[styles.statValue, styles.statValueWarning]}>
                {formatCurrency(totalWithdrawals)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Transfers</Text>
              <Text style={[styles.statValue, styles.statValueInfo]}>
                {formatCurrency(totalTransfers)}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.detailsContainer}>
            {account.account_number && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account Number</Text>
                <Text style={styles.detailValue}>••••{account.account_number.slice(-4)}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Opening Balance</Text>
              <Text style={styles.detailValue}>{formatCurrency(Number(account.opening_balance))}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Balance</Text>
              <Text style={styles.detailValue}>{formatCurrency(Number(account.current_balance))}</Text>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <View style={styles.sectionActions}>
              {transactions.length > 0 && (
                <IconButton
                  icon={() => <Download size={20} color="#4f46e5" />}
                  onPress={() => {}}
                />
              )}
              <Button
                mode="contained"
                onPress={() => router.push(`/banking/${id}/transactions/new` as any)}
                style={styles.sectionButton}
              >
                New Transaction
              </Button>
            </View>
          </View>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>No transactions found</Text>
          ) : (
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Type</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Date</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Description</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Amount</Text>
              </View>
              {transactions.slice(0, 10).map((transaction, index) => (
                <AnimatedView
                  key={transaction.id}
                  entering={FadeInUp.duration(300).delay(index * 100)}
                >
                  <Pressable 
                    onPress={() => router.push(`/banking/${id}/transactions/${transaction.id}` as any)}
                    style={({ pressed }) => [
                      styles.tableRow,
                      pressed && styles.tableRowPressed
                    ]}
                  >
                    <View style={[styles.tableCellContainer, { flex: 1.2 }]}>
                      <View style={styles.transactionIcon}>
                        {getTransactionIcon(transaction.type)}
                      </View>
                      <Text style={styles.tableCellText} numberOfLines={1}>
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </Text>
                    </View>
                    <Text style={[styles.tableCellText, { flex: 1 }]}>
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </Text>
                    <Text style={[styles.tableCellText, { flex: 1.2 }]} numberOfLines={1}>
                      {transaction.description}
                    </Text>
                    <Text style={[
                      styles.tableCellText,
                      styles.tableCellAmount,
                      { flex: 0.8 },
                      transaction.type === 'deposit' ? styles.amountPositive : styles.amountNegative
                    ]}>
                      {formatCurrency(Number(transaction.amount))}
                    </Text>
                  </Pressable>
                </AnimatedView>
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
          <Text style={styles.modalTitle}>Delete Account</Text>
          <Text style={styles.modalDescription}>
            Are you sure you want to delete {account.name}? This action cannot be undone.
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
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: Platform.OS === 'android' ? 4 : 0,
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
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionButton: {
    backgroundColor: '#4f46e5',
  },
  detailsContainer: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
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
    alignItems: 'center',
  },
  tableRowPressed: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tableCellText: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  tableCellContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  tableCellAmount: {
    fontWeight: '600',
  },
  amountPositive: {
    color: '#059669',
  },
  amountNegative: {
    color: '#dc2626',
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
  statValueSuccess: {
    color: '#059669',
  },
  statValueWarning: {
    color: '#d97706',
  },
  statValueInfo: {
    color: '#2563eb',
  },
}); 