import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, Platform, TextInput } from 'react-native'; // Removed Pressable
import { Text, Button, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router'; // Removed Stack
import { useBusiness } from '@/contexts/BusinessContext';
import { Table, Column } from '@/components/ui/Table'; // Import the new Table component
import { getBankAccounts, BankAccount } from '../../../lib/api/bank-accounts';
import { CreditCard, Plus, DollarSign, IndianRupee, Search } from 'lucide-react-native'; // Removed ChevronRight
import { LinearGradient } from 'expo-linear-gradient';
// Removed Animated imports

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

// Define columns for the reusable table
const accountColumns: Column<BankAccount>[] = [
  {
    key: 'name',
    header: 'Account',
    flex: 1.5,
  },
  {
    key: 'account_type',
    header: 'Type',
    flex: 1,
  },
  {
    key: 'current_balance',
    header: 'Balance',
    flex: 1, // Adjusted flex
    isNumeric: true,
    render: (item) => formatCurrency(Number(item.current_balance)),
  },
];

export default function BankingPage() {
  const router = useRouter();
  const { selectedBusiness } = useBusiness();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const fetchAccounts = async () => {
    if (!selectedBusiness) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getBankAccounts(selectedBusiness.id);
      if (response.error) throw new Error(response.error);
      setAccounts(response.data || []);
    } catch (err: any) {
      console.error('Error fetching bank accounts:', err);
      setError(err.message || 'Failed to load bank accounts');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness) {
      fetchAccounts();
    }
  }, [selectedBusiness]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAccounts();
  };

  const filteredAccounts = accounts.filter(account => 
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.account_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBalance = filteredAccounts.reduce((sum: number, account: BankAccount) =>
    sum + Number(account.current_balance), 0);

  const handleRowPress = useCallback((account: BankAccount) => {
    router.push(`/banking/${account.id}` as any); // Added 'as any' to match original code
  }, [router]);

  // Define Empty State Component for the Table
  const EmptyAccountsTable = () => (
    <View style={styles.emptyState}>
      <CreditCard size={48} color="#64748B" strokeWidth={2.5} />
      <Text style={styles.emptyTitle}>No accounts found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search' : 'Start adding your bank accounts'}
      </Text>
      {!searchQuery && (
        <Button
          mode="contained"
          onPress={() => router.push('/banking/new' as any)}
          style={styles.emptyButton}
        >
          Add Account
        </Button>
      )}
    </View>
  );

  // Removed getAccountTypeIcon as it's not used with the Table component directly

  // Removed leftover code block from getAccountTypeIcon function

  if (isLoading) {
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
          <Text style={styles.emptyTitle}>Please select or create a business to continue.</Text>
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
            <View style={styles.titleIcon}>
              <CreditCard size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.titleWrapper}>
              <Text style={styles.headerTitle}>Bank & Cash Accounts</Text>
              <Text style={styles.headerSubtitle}>Manage your bank accounts and track balances</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon={() => <Search size={20} color="#ffffff" />}
              onPress={() => setShowSearch(true)}
            />
            <IconButton
              icon={() => <Plus size={20} color="#ffffff" />}
              onPress={() => router.push('/banking/new' as any)}
            />
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <IndianRupee size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Balance</Text>
              <Text style={styles.statValue}>{formatCurrency(totalBalance)}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <CreditCard size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Accounts</Text>
              <Text style={styles.statValue}>{filteredAccounts.length}</Text>
            </View>
          </View>
        </View>

        {showSearch && (
          <View style={styles.searchContainer}>
            <Search size={20} color="#94a3b8" strokeWidth={2.5} />
            <TextInput
              placeholder="Search accounts..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        )}
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
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText} onPress={fetchAccounts}>
              Tap to retry
            </Text>
          </View>
        )}

        {/* Use the reusable Table component */}
        <Table
          columns={accountColumns}
          data={filteredAccounts}
          getKey={(item) => item.id.toString()} // Ensure key is string
          onRowPress={handleRowPress}
          loading={isLoading} // Use isLoading state
          EmptyStateComponent={EmptyAccountsTable}
          containerStyle={styles.tableComponentContainer} // Add specific container style if needed
        />

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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0f172a',
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
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryText: {
    color: '#4f46e5',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    // Removed duplicate alignItems and justifyContent
    padding: 24,
    marginTop: 32, // Reduced margin top for table empty state
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#4f46e5',
  },
  // Removed old table styles: tableContainer, tableHeader, accountCard, accountContent, accountPressed, tableCell, tableHeaderText, tableCellText, tableCellAmount, chevron
  tableComponentContainer: {
    // Add any specific container styles for the Table component if needed
    // Example: marginTop: 16
  },
});
