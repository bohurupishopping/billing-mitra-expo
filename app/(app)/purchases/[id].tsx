import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, Button, IconButton, Portal, Dialog } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Calendar, ShoppingBag, User, Trash2, CircleAlert as AlertCircle, Pencil, IndianRupee, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

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
            <Text variant="titleLarge" style={styles.purchaseNumber}>
              Purchase #{purchase?.purchase_number}
            </Text>
            <Text variant="titleMedium" style={styles.totalAmount}>
              ₹{purchase?.total_price.toLocaleString()}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon={() => <Pencil size={20} color="#ffffff" />}
              onPress={() => router.push(`/purchases/edit/${id}`)}
            />
            <IconButton
              icon={() => <Trash2 size={20} color="#ffffff" />}
              onPress={() => setShowDeleteDialog(true)}
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
          <View style={styles.loadingContainer}>
            <Text>Loading purchase details...</Text>
          </View>
        ) : !purchase ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={48} color="#ef4444" />
            <Text style={styles.emptyText}>Purchase not found</Text>
            <Button mode="contained" onPress={() => router.back()}>
              Go Back
            </Button>
          </View>
        ) : (
          <Animated.View 
            entering={FadeIn.duration(300)}
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
                  <Text style={styles.descriptionLabel}>Description</Text>
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
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
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
    flexDirection: 'row',
    gap: 4,
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
  detailsContainer: {
    padding: 16,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  descriptionLabel: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 8,
  },
  descriptionText: {
    color: '#1e293b',
    fontSize: 16,
    lineHeight: 24,
  },
});