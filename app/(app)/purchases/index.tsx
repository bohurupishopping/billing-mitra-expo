import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, Pressable, Platform, TextInput } from 'react-native';
import { Text, Card, Button, FAB, Searchbar, SegmentedButtons, IconButton, Portal, Modal } from 'react-native-paper';
import { router } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, Building2, Calendar, User, DollarSign, TrendingUp, Package, Search, Filter, Plus, ChevronRight } from 'lucide-react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

type Purchase = {
  id: string;
  purchase_number: string;
  purchase_date: string;
  item_name: string;
  quantity: number;
  total_price: number;
  creditors: {
    name: string;
  } | null;
};

type TimeFilter = 'all' | 'week' | 'month' | 'year';

const { width } = Dimensions.get('window');
const cardWidth = width > 768 ? (width - 96) / 2 : width - 32;

export default function PurchasesScreen() {
  const { selectedBusiness } = useBusiness();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const fetchPurchases = async () => {
    if (!selectedBusiness) return;

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('purchases')
        .select('*, creditors(name)')
        .eq('business_id', selectedBusiness.id)
        .order('purchase_date', { ascending: false });

      if (fetchError) throw fetchError;
      setPurchases(data || []);
    } catch (err: any) {
      console.error('Error fetching purchases:', err);
      setError('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness) {
      fetchPurchases();
    }
  }, [selectedBusiness]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPurchases();
    setRefreshing(false);
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = 
      purchase.purchase_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.creditors?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const purchaseDate = new Date(purchase.purchase_date);
    const now = new Date();
    
    switch (timeFilter) {
      case 'week':
        return purchaseDate >= new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return purchaseDate >= new Date(now.setMonth(now.getMonth() - 1));
      case 'year':
        return purchaseDate >= new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return true;
    }
  });

  const totalAmount = filteredPurchases.reduce((sum, purchase) => sum + purchase.total_price, 0);
  const averageAmount = filteredPurchases.length > 0 ? totalAmount / filteredPurchases.length : 0;

  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value as TimeFilter);
  };

  if (!selectedBusiness) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Building2 size={48} color="#64748B" strokeWidth={2.5} />
          <Text style={styles.emptyTitle}>No Business Selected</Text>
          <Text style={styles.emptySubtitle}>
            Please select a business to view purchases
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
        colors={['#1e40af', '#1e3a8a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <View style={styles.titleIcon}>
              <ShoppingBag size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.titleWrapper}>
              <Text style={styles.headerTitle}>Purchases</Text>
              <Text style={styles.headerSubtitle}>View your purchase history</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon={() => <Search size={20} color="#ffffff" />}
              onPress={() => setShowSearch(true)}
            />
            <IconButton
              icon={() => <Filter size={20} color="#ffffff" />}
              onPress={() => setShowFilter(true)}
            />
            <IconButton
              icon={() => <Plus size={20} color="#ffffff" />}
              onPress={() => router.push('/purchases/new')}
            />
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <DollarSign size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValue}>₹{totalAmount.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <TrendingUp size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={styles.statValue}>₹{averageAmount.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Package size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Items</Text>
              <Text style={styles.statValue}>{filteredPurchases.length}</Text>
            </View>
          </View>
        </View>

        {showSearch && (
          <View style={styles.searchContainer}>
            <Search size={20} color="#94a3b8" strokeWidth={2.5} />
            <TextInput
              placeholder="Search purchases..."
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
            tintColor="#1e40af"
            colors={['#1e40af']}
            progressBackgroundColor="#ffffff"
          />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText} onPress={fetchPurchases}>
              Tap to retry
            </Text>
          </View>
        )}

        {filteredPurchases.length === 0 ? (
          <View style={styles.emptyState}>
            <ShoppingBag size={48} color="#64748B" strokeWidth={2.5} />
            <Text style={styles.emptyTitle}>No Purchases Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search' : 'Start recording your purchases'}
            </Text>
            {!searchQuery && (
              <Button 
                mode="contained"
                onPress={() => router.push('/purchases/new')}
                style={styles.emptyButton}
              >
                Record Purchase
              </Button>
            )}
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <View style={[styles.tableCell, { flex: 1 }]}>
                <Text style={styles.tableHeaderText}>Date</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1.2 }]}>
                <Text style={styles.tableHeaderText}>Creditor</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1.5 }]}>
                <Text style={styles.tableHeaderText}>Item</Text>
              </View>
              <View style={[styles.tableCell, { flex: 0.8 }]}>
                <Text style={styles.tableHeaderText}>Total</Text>
              </View>
            </View>
            {filteredPurchases.map((purchase, index) => (
              <AnimatedView
                key={purchase.id}
                entering={FadeInUp.duration(300).delay(index * 100)}
                style={styles.paymentCard}
              >
                <Pressable 
                  onPress={() => router.push(`/purchases/${purchase.id}`)}
                  style={({ pressed }) => [
                    styles.paymentContent,
                    pressed && styles.paymentPressed
                  ]}
                >
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <Text style={styles.tableCellText}>
                      {format(new Date(purchase.purchase_date), 'MMM dd, yyyy')}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.2 }]}>
                    <Text style={styles.tableCellText} numberOfLines={1}>
                      {purchase.creditors?.name || 'No Creditor'}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.5 }]}>
                    <Text style={styles.tableCellText} numberOfLines={1}>
                      {purchase.item_name}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 0.8 }]}>
                    <Text style={styles.tableCellAmount}>
                      ₹{purchase.total_price.toLocaleString()}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#64748b" style={styles.chevron} />
                </Pressable>
              </AnimatedView>
            ))}
          </View>
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={showFilter}
          onDismiss={() => setShowFilter(false)}
          style={styles.modal}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Time</Text>
            <SegmentedButtons
              value={timeFilter}
              onValueChange={handleTimeFilterChange}
              buttons={[
                { value: 'all', label: 'All' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'year', label: 'Year' },
              ]}
              style={styles.timeFilter}
            />
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
    color: '#1e40af',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 48,
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
    backgroundColor: '#1e40af',
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
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  paymentContent: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  paymentPressed: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableHeaderText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
  },
  tableCellText: {
    color: '#1e293b',
    fontSize: 14,
  },
  tableCellAmount: {
    color: '#1e40af',
    fontWeight: '600',
    fontSize: 14,
  },
  chevron: {
    marginLeft: 8,
  },
  modal: {
    margin: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  timeFilter: {
    backgroundColor: '#ffffff',
  },
});