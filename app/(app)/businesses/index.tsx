import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, Platform, Pressable } from 'react-native';
import { Text, Card, Button, FAB, Portal, Modal, TextInput, HelperText } from 'react-native-paper';
import { useBusiness } from '@/contexts/BusinessContext';
import { Building2, MapPin, Phone, Mail, FileText, TrendingUp, Users, Receipt, CreditCard, Check, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isTablet = width > 768;
const cardWidth = isTablet 
  ? (width - 48) / 3 // 3 cards per row on tablet
  : (width - 32) / 2; // 2 cards per row on mobile

export default function BusinessesScreen() {
  const { businesses, loading, error, fetchBusinesses, createBusiness, selectBusiness, selectedBusiness } = useBusiness();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    tax_id: '',
    logo_url: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBusinesses();
    setRefreshing(false);
  };

  const handleCreateBusiness = async () => {
    try {
      setCreating(true);
      setFormError(null);

      if (!formData.name.trim()) {
        throw new Error('Business name is required');
      }

      await createBusiness(formData);
      setModalVisible(false);
      setFormData({ name: '', address: '', phone: '', email: '', tax_id: '', logo_url: '' });
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2563EB', '#1d4ed8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <View style={styles.titleIcon}>
              <Building2 size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.titleWrapper}>
              <Text style={styles.headerTitle}>Your Businesses</Text>
              <Text style={styles.headerSubtitle}>Manage your business profiles</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <TrendingUp size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Revenue</Text>
              <Text style={styles.statValue}>₹45K</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Users size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Customers</Text>
              <Text style={styles.statValue}>12</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Receipt size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Invoices</Text>
              <Text style={styles.statValue}>8</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
            colors={['#2563EB']}
            progressBackgroundColor="#ffffff"
          />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText} onPress={fetchBusinesses}>
              Tap to retry
            </Text>
          </View>
        )}

        <View style={styles.businessList}>
          {businesses.map((business) => (
            <Animated.View 
              key={business.id}
              entering={FadeIn.duration(300)}
              style={[styles.cardWrapper, { width: cardWidth }]}
            >
              <Pressable 
                style={[
                  styles.card,
                  selectedBusiness?.id === business.id && styles.selectedCard
                ]} 
                onPress={() => selectBusiness(business)}
              >
                <View style={styles.cardContent}>
                  <View style={[
                    styles.logoContainer,
                    selectedBusiness?.id === business.id && styles.selectedLogoContainer
                  ]}>
                    <Building2 
                      size={24} 
                      color={selectedBusiness?.id === business.id ? '#ffffff' : '#2563EB'} 
                      strokeWidth={2.5}
                    />
                  </View>
                  <Text style={[
                    styles.businessName,
                    selectedBusiness?.id === business.id && styles.selectedBusinessName
                  ]}>
                    {business.name}
                  </Text>
                  {selectedBusiness?.id === business.id && (
                    <View style={styles.selectedBadge}>
                      <Check size={16} color="#ffffff" strokeWidth={2.5} />
                      <Text style={styles.selectedText}>Active</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          style={styles.modal}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Create New Business
            </Text>

            <TextInput
              mode="outlined"
              label="Business Name"
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Address"
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              style={styles.input}
              multiline
              numberOfLines={3}
            />

            <TextInput
              mode="outlined"
              label="Phone"
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              style={styles.input}
              keyboardType="phone-pad"
            />

            <TextInput
              mode="outlined"
              label="Email"
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              mode="outlined"
              label="Tax ID"
              value={formData.tax_id}
              onChangeText={(text) => setFormData(prev => ({ ...prev, tax_id: text }))}
              style={styles.input}
            />

            {formError && (
              <HelperText type="error" visible={true}>
                {formError}
              </HelperText>
            )}

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setModalVisible(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateBusiness}
                loading={creating}
                disabled={creating}
                style={styles.modalButton}
              >
                Create
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      <FAB
        icon={() => <Plus size={20} color="#ffffff" strokeWidth={2.5} />}
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        label="Add Business"
      />
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
    color: '#2563EB',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  businessList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
    justifyContent: 'flex-start',
  },
  cardWrapper: {
    marginBottom: 12,
    width: cardWidth,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  selectedCard: {
    borderColor: '#2563EB',
    backgroundColor: '#f8fafc',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  selectedLogoContainer: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  businessName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  selectedBusinessName: {
    color: '#2563EB',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 2,
  },
  selectedText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2563EB',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    minWidth: 100,
  },
});