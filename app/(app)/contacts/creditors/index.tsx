import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, Platform, TextInput } from 'react-native'; // Removed Pressable
import { Text, Button, IconButton } from 'react-native-paper'; // Removed FAB, SegmentedButtons, Portal, Modal
import { router } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { Table, Column } from '@/components/ui/Table'; // Import the new Table component
import { supabase } from '@/lib/supabase';
import { Users, Building2, IndianRupee, TrendingUp, Search, Plus } from 'lucide-react-native'; // Removed Calendar, User, Wallet, Filter, ChevronRight
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient'; // Re-added LinearGradient for header

interface Creditor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  outstanding_amount: number;
  created_at: string;
}

// Define columns for the reusable table
const creditorColumns: Column<Creditor>[] = [
  {
    key: 'name',
    header: 'Name',
    flex: 1.5, // Keep Name column
  },
  {
    key: 'created_at',
    header: 'Date',
    flex: 1,
    render: (item) => format(new Date(item.created_at), 'dd/MM/yy'),
  },
  {
    key: 'outstanding_amount',
    header: 'Outstanding', // Keep Outstanding column
    flex: 1, // Adjusted flex
    isNumeric: true,
    render: (item) => `₹${item.outstanding_amount.toLocaleString()}`,
  },
];

const { width } = Dimensions.get('window');
const isTablet = width > 768;

export default function CreditorsScreen() {
  const { selectedBusiness } = useBusiness();
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); // Add state for current page

  const fetchCreditors = async () => {
    if (!selectedBusiness) return;

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('creditors')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('name');

      if (fetchError) throw fetchError;
      setCreditors(data || []);
    } catch (err: any) {
      console.error('Error fetching creditors:', err);
      setError('Failed to load creditors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness) {
      fetchCreditors();
    }
  }, [selectedBusiness]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCreditors();
    setRefreshing(false);
  };

  const filteredCreditors = creditors.filter(creditor => 
    creditor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (creditor.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    (creditor.phone?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalOutstanding = filteredCreditors.reduce((sum, creditor) => sum + creditor.outstanding_amount, 0);
  const averageOutstanding = filteredCreditors.length > 0 ? totalOutstanding / filteredCreditors.length : 0;

  const handleRowPress = useCallback((creditor: Creditor) => {
    router.push(`/contacts/creditors/${creditor.id}`);
  }, []);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Optional: Scroll to top when page changes
    // scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Define Empty State Component for the Table
  const EmptyCreditorsTable = () => (
    <View style={styles.emptyState}>
      <Users size={48} color="#64748B" strokeWidth={2.5} />
      <Text style={styles.emptyTitle}>No Creditors Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search' : 'Start adding your creditors'}
      </Text>
      {!searchQuery && (
        <Button
          mode="contained"
          onPress={() => router.push('/contacts/creditors/new')}
          style={styles.emptyButton}
        >
          Add Creditor
        </Button>
      )}
    </View>
  );

  if (!selectedBusiness) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Building2 size={48} color="#64748B" strokeWidth={2.5} />
          <Text style={styles.emptyTitle}>No Business Selected</Text>
          <Text style={styles.emptySubtitle}>
            Please select a business to view creditors
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
            <View style={styles.titleIcon}>
              <Users size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.titleWrapper}>
              <Text style={styles.headerTitle}>Creditors</Text>
              <Text style={styles.headerSubtitle}>Manage people you owe money to</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon={() => <Search size={20} color="#ffffff" />}
              onPress={() => setShowSearch(true)}
            />
            <IconButton
              icon={() => <Plus size={20} color="#ffffff" />}
              onPress={() => router.push('/contacts/creditors/new')}
            />
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <IndianRupee size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Outstanding</Text>
              <Text style={styles.statValue}>₹{totalOutstanding.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <TrendingUp size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={styles.statValue}>₹{averageOutstanding.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Users size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Creditors</Text>
              <Text style={styles.statValue}>{filteredCreditors.length}</Text>
            </View>
          </View>
        </View>

        {showSearch && (
          <View style={styles.searchContainer}>
            <Search size={20} color="#94a3b8" strokeWidth={2.5} />
            <TextInput
              placeholder="Search creditors..."
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
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.retryText} onPress={fetchCreditors}>
              Tap to retry
            </Text>
          </View>
        )}

        {/* Use the reusable Table component */}
        <Table
          columns={creditorColumns}
          data={filteredCreditors} // Pass the full filtered list
          getKey={(item) => item.id}
          onRowPress={handleRowPress}
          loading={loading}
          EmptyStateComponent={EmptyCreditorsTable}
          containerStyle={styles.tableComponentContainer}
          // Pagination Props
          currentPage={currentPage}
          totalItems={filteredCreditors.length} // Total items in the filtered list
          onPageChange={handlePageChange}
          itemsPerPage={12} // Explicitly set items per page
        />

      </ScrollView>
      {/* Removed Portal and Modal as they are not used here */}
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
    backgroundColor: '#4f46e5', // Keep creditor-specific color
  },
  // Removed old table styles: tableContainer, tableHeader, creditorCard, creditorContent, creditorPressed, tableCell, tableHeaderText, tableCellText, tableCellAmount, chevron
  tableComponentContainer: {
    // Add any specific container styles for the Table component if needed
    // Example: marginTop: 16
  },
});
