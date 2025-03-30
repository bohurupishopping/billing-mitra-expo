import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform, Image } from 'react-native';
import { Text, Card, Button, Portal, Dialog } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, RefreshCw, CircleAlert as AlertCircle, Calendar, Pencil, CreditCard, Download, Trash2 } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type Transaction = {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  date: string;
  description: string;
  category: string | null;
  reconciled: boolean;
  notes: string | null;
};

type BankAccount = {
  id: string;
  name: string;
  account_number: string | null;
  account_type: string;
  opening_balance: number;
  current_balance: number;
  created_at: string;
};

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams();
  const { selectedBusiness } = useBusiness();
  
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (selectedBusiness && id) {
      fetchAccountData();
    }
  }, [selectedBusiness, id]);

  const fetchAccountData = async () => {
    if (!selectedBusiness || !id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch account details
      const { data: accountData, error: accountError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (accountError) throw accountError;
      setAccount(accountData);
      
      // Fetch account transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', id)
        .eq('business_id', selectedBusiness.id)
        .order('date', { ascending: false })
        .limit(5);
        
      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);
    } catch (err: any) {
      console.error('Error fetching account data:', err);
      setError('Failed to load account information');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAccountData();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    if (!selectedBusiness || !id) return;
    
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id)
        .eq('business_id', selectedBusiness.id);
        
      if (error) throw error;
      router.back();
    } catch (err: any) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !account) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading account details...</Text>
        </View>
      </View>
    );
  }

  if (!account) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#ef4444" />
          <Text style={styles.errorText}>Account not found</Text>
          <Button mode="contained" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  const HeaderBackground = Platform.select({
    web: () => (
      <img
        src="https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?w=800&auto=format&fit=crop&q=80"
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
        source={{ uri: 'https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?w=800&auto=format&fit=crop&q=80' }}
        style={[StyleSheet.absoluteFillObject, { opacity: 0.9 }]}
        blurRadius={70}
      />
    )
  });

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <HeaderBackground />
        <View style={styles.headerContent}>
          <View style={styles.accountInfo}>
            <Text variant="titleLarge" style={styles.accountName}>
              {account.name}
            </Text>
            <Text variant="titleMedium" style={styles.accountType}>
              {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              mode="contained"
              icon={() => <Pencil size={20} color="#ffffff" />}
              onPress={() => router.push(`/finances/accounts/edit/${id}`)}
              style={styles.editButton}
            >
              Edit
            </Button>
            <Button
              mode="contained"
              icon={() => <Trash2 size={20} color="#ffffff" />}
              onPress={() => setShowDeleteDialog(true)}
              style={styles.deleteButton}
            >
              Delete
            </Button>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Animated.View 
          entering={FadeIn.duration(300)}
          style={styles.mainCard}
        >
          <Card>
            <Card.Content>
              <View style={styles.balanceSection}>
                <View style={styles.balanceHeader}>
                  <CreditCard size={24} color="#2563eb" />
                  <Text variant="titleMedium" style={styles.balanceTitle}>
                    Current Balance
                  </Text>
                </View>
                <Text variant="headlineLarge" style={styles.balanceAmount}>
                  {formatCurrency(account.current_balance)}
                </Text>
                {account.account_number && (
                  <Text variant="bodyMedium" style={styles.accountNumber}>
                    ••••{account.account_number.slice(-4)}
                  </Text>
                )}
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text variant="bodyMedium" style={styles.statLabel}>Opening Balance</Text>
                  <Text variant="titleMedium" style={styles.statValue}>
                    {formatCurrency(account.opening_balance)}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text variant="bodyMedium" style={styles.statLabel}>Created On</Text>
                  <Text variant="titleMedium" style={styles.statValue}>
                    {format(new Date(account.created_at), 'MMM dd, yyyy')}
                  </Text>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  icon={() => <ArrowDownRight size={20} color="#ffffff" />}
                  onPress={() => router.push('/finances/transactions/new', { accountId: id, type: 'deposit' })}
                  style={[styles.actionButton, { backgroundColor: '#22c55e' }]}
                >
                  Deposit
                </Button>

                <Button
                  mode="contained"
                  icon={() => <ArrowUpRight size={20} color="#ffffff" />}
                  onPress={() => router.push('/finances/transactions/new', { accountId: id, type: 'withdrawal' })}
                  style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                >
                  Withdraw
                </Button>

                <Button
                  mode="contained"
                  icon={() => <RefreshCw size={20} color="#ffffff" />}
                  onPress={() => router.push('/finances/transactions/new', { accountId: id, type: 'transfer' })}
                  style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                >
                  Transfer
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Animated.View>

        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Recent Transactions</Text>
            <Button 
              mode="text"
              onPress={() => router.push('/finances/transactions')}
            >
              View All
            </Button>
          </View>

          <Card>
            <Card.Content>
              {transactions.length === 0 ? (
                <View style={styles.emptyTransactions}>
                  <Text variant="bodyMedium" style={styles.emptyText}>
                    No transactions recorded yet
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => router.push('/finances/transactions/new', { accountId: id })}
                    style={styles.emptyButton}
                  >
                    Record First Transaction
                  </Button>
                </View>
              ) : (
                <View style={styles.transactionList}>
                  {transactions.map((transaction) => (
                    <View key={transaction.id} style={styles.transactionItem}>
                      <View style={styles.transactionIcon}>
                        {transaction.type === 'deposit' && (
                          <ArrowDownRight size={20} color="#16a34a" />
                        )}
                        {transaction.type === 'withdrawal' && (
                          <ArrowUpRight size={20} color="#dc2626" />
                        )}
                        {transaction.type === 'transfer' && (
                          <RefreshCw size={20} color="#2563eb" />
                        )}
                      </View>

                      <View style={styles.transactionDetails}>
                        <Text variant="bodyMedium" style={styles.transactionDescription}>
                          {transaction.description}
                        </Text>
                        <Text variant="bodySmall" style={styles.transactionDate}>
                          {format(new Date(transaction.date), 'MMM dd, yyyy')}
                        </Text>
                      </View>

                      <Text 
                        variant="bodyMedium" 
                        style={[
                          styles.transactionAmount,
                          { 
                            color: transaction.type === 'deposit' 
                              ? '#16a34a' 
                              : transaction.type === 'withdrawal'
                              ? '#dc2626'
                              : '#2563eb'
                          }
                        ]}
                      >
                        {transaction.type === 'withdrawal' ? '-' : ''}
                        {formatCurrency(transaction.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        </View>
      </View>

      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Account</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete this account? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onPress={handleDelete} textColor="#ef4444">Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    backgroundColor: '#4f46e5',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 16,
    paddingBottom: 24,
    height: 180,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 4,
  },
  accountType: {
    color: '#e0e7ff',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  content: {
    padding: 16,
    marginTop: -48,
  },
  mainCard: {
    marginBottom: 24,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  balanceTitle: {
    color: '#1e293b',
    fontWeight: '500',
  },
  balanceAmount: {
    color: '#1e293b',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  accountNumber: {
    color: '#64748b',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    color: '#1e293b',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  transactionsSection: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#1e293b',
    fontWeight: '600',
  },
  emptyTransactions: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#64748b',
    marginBottom: 16,
  },
  emptyButton: {
    minWidth: 200,
  },
  transactionList: {
    gap: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    color: '#1e293b',
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionDate: {
    color: '#64748b',
  },
  transactionAmount: {
    fontWeight: '600',
  },
});