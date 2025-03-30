import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Platform } from 'react-native';
import { Text, Button, IconButton, Portal, Dialog, ActivityIndicator } from 'react-native-paper'; // Added ActivityIndicator
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Calendar, ShoppingBag, User, Trash2, CircleAlert as AlertCircle, Pencil, IndianRupee, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated'; // Changed to FadeInUp
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Import safe area hook

type Purchase = {
  id: string;
  purchase_number: string;
  purchase_date: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  description: string | null;
  creditors: {
    id: string;
    name: string;
  } | null;
};

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { selectedBusiness } = useBusiness();
  const insets = useSafeAreaInsets(); // Get safe area insets
  
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchPurchase = async () => {
    if (!selectedBusiness || !id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, creditors(id, name)')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (error) throw error;
      setPurchase(data);
    } catch (err: any) {
      console.error('Error fetching purchase:', err);
      setError('Failed to load purchase details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness && id) {
      fetchPurchase();
    }
  }, [selectedBusiness, id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPurchase();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      router.replace('/purchases');
    } catch (err: any) {
      console.error('Error deleting purchase:', err);
      setError('Failed to delete purchase');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e40af', '#1e3a8a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]} // Use safe area inset
      >
        <View style={styles.headerContent}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={10}
            aria-label="Go back"
          >
            <ArrowLeft size={24} color="#ffffff" />
          </Pressable>
          <View style={styles.headerText}>
            <Text variant="titleLarge" style={styles.purchaseNumber}>
              Purchase #{purchase?.purchase_number || '...'}
            </Text>
            <Text variant="titleMedium" style={styles.totalAmount}>
              ₹{purchase?.total_price.toLocaleString()}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon={() => <Pencil size={20} color="#ffffff" />}
              style={styles.headerActionButton}
              onPress={() => router.push(`/purchases/edit/${id}`)}
              disabled={!purchase} // Disable if no purchase data
            />
            <IconButton
              icon={() => <Trash2 size={20} color="#ffffff" />}
              style={styles.headerActionButton}
              onPress={() => setShowDeleteDialog(true)}
              disabled={!purchase} // Disable if no purchase data
            />
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
          <View style={styles.centeredContainer}>
            <ActivityIndicator animating={true} size="large" />
            <Text>Loading purchase details...</Text>
          </View>
        ) : !purchase ? (
          <View style={styles.centeredContainer}>
            <AlertCircle size={48} color="#ef4444" />
            <Text style={styles.emptyText}>Purchase not found</Text>
            <Button mode="contained" onPress={() => router.back()}>
              Go Back
            </Button>
          </View>
        ) : (
          <Animated.View 
            entering={FadeInUp.duration(400).delay(100)} // Use FadeInUp
            style={styles.detailsContainer}
          >
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <Calendar size={16} color="#64748b" />
                  <Text style={styles.labelText}>Purchase Date</Text>
                </View>
                <Text style={styles.detailValue}>
                  {format(new Date(purchase.purchase_date), 'MMM dd, yyyy')}
                </Text>
              </View>

              {purchase.creditors && (
                <View style={styles.detailRow}>
                  <View style={styles.detailLabel}>
                    <User size={16} color="#64748b" />
                    <Text style={styles.labelText}>Supplier</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {purchase.creditors.name}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <ShoppingBag size={16} color="#64748b" />
                  <Text style={styles.labelText}>Item</Text>
                </View>
                <Text style={styles.detailValue}>
                  {purchase.item_name}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <Text style={styles.labelText}>Quantity</Text>
                </View>
                <Text style={styles.detailValue}>
                  {purchase.quantity} units
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <IndianRupee size={16} color="#64748b" />
                  <Text style={styles.labelText}>Unit Price</Text>
                </View>
                <Text style={styles.detailValue}>
                  ₹{purchase.unit_price.toLocaleString()}
                </Text>
              </View>

              <View style={[styles.detailRow, styles.totalRow]}>
                <View style={styles.detailLabel}>
                  <IndianRupee size={16} color="#2563eb" />
                  <Text style={[styles.labelText, styles.totalLabel]}>Total Price</Text>
                </View>
                <Text style={styles.totalValue}>
                  ₹{purchase.total_price.toLocaleString()}
                </Text>
              </View>

              {purchase.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionLabel}>Notes / Description</Text>
                  <Text style={styles.descriptionText}>
                    {purchase.description}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Purchase</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete this purchase? This action cannot be undone.
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
    paddingHorizontal: 16,
    paddingBottom: 20, // Increased bottom padding
    borderBottomLeftRadius: 16, // Add subtle rounding
    borderBottomRightRadius: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 8, // Add padding for easier touch
    borderRadius: 16, // Make it round
  },
  headerText: {
    flex: 1,
  },
  purchaseNumber: {
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 4,
  },
  totalAmount: {
    color: '#ffffff',
    opacity: 0.8,
  },
  headerActions: {
    // Styles for header action buttons
    flexDirection: 'row',
  },
  headerActionButton: {
    margin: -8, // Reduce default margin to bring icons closer
  },
  content: {
    flex: 1,
  },
  centeredContainer: { // Renamed for clarity and reuse
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
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
  },
  detailsContainer: {
    padding: 16,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    elevation: 1, // Add subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelText: {
    color: '#64748b',
    fontSize: 14,
  },
  detailValue: {
    color: '#1e293b',
    fontSize: 16,
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLabel: {
    color: '#2563eb',
    fontWeight: '600',
  },
  totalValue: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  descriptionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  descriptionLabel: { // Changed label style
    color: '#64748b',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  descriptionText: {
    color: '#1e293b',
    fontSize: 16,
    lineHeight: 24,
  },
});