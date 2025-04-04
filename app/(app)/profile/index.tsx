import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Pressable, Dimensions, Image } from 'react-native';
import { Text, Button, TextInput, HelperText, Portal, Modal } from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { User, Mail, Phone, Calendar, LogOut, Settings, Shield, Bell, Building2, MapPin, Check, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { width } = Dimensions.get('window');
const isTablet = width > 768;
const cardWidth = (width - 40) / 2;

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { businesses, loading: businessesLoading, error: businessesError, fetchBusinesses, createBusiness, selectBusiness, selectedBusiness } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
  });
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

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
      fetchBusinesses();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session?.user?.id);

      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
    <View style={styles.wrapper}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80' }}
            style={[StyleSheet.absoluteFillObject, { opacity: 0.9 }]}
            blurRadius={70}
          />
          <Animated.View 
            entering={FadeInDown.duration(600).springify()}
            style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <View style={styles.titleIcon}>
                <User size={24} color="#ffffff" strokeWidth={2.5} />
              </View>
              <View style={styles.titleWrapper}>
                <Text style={styles.headerTitle}>Profile</Text>
                <Text style={styles.headerSubtitle}>Manage your account settings</Text>
              </View>
            </View>

            <View style={styles.profileContainer}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <User size={40} color="#ffffff" strokeWidth={2.5} />
                </View>
              </View>
              <Text style={styles.profileName}>{profile.full_name || 'User'}</Text>
              <Text style={styles.profileEmail}>{session?.user?.email}</Text>
            </View>
          </Animated.View>
        </View>

        <View style={styles.content}>
          <AnimatedView 
            entering={FadeInUp.duration(300).delay(100)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Mail size={20} color="#6366f1" strokeWidth={2.5} />

            </View>

            <View style={styles.card}>
              <View style={styles.accountGrid}>
                <View style={styles.accountInput}>
                  <TextInput
                    mode="outlined"
                    label="Full Name"
                    value={profile.full_name}
                    onChangeText={(text) => setProfile(prev => ({ ...prev, full_name: text }))}
                    style={styles.input}
                  />
                </View>
                <View style={styles.accountInput}>
                  <TextInput
                    mode="outlined"
                    label="Phone"
                    value={profile.phone}
                    onChangeText={(text) => setProfile(prev => ({ ...prev, phone: text }))}
                    keyboardType="phone-pad"
                    style={styles.input}
                  />
                </View>
              </View>

              <TextInput
                mode="outlined"
                label="Email"
                value={session?.user?.email || ''}
                disabled
                style={styles.input}
              />

              {error && (
                <HelperText type="error" visible={true}>
                  {error}
                </HelperText>
              )}

              <Button
                mode="contained"
                onPress={updateProfile}
                loading={loading}
                style={styles.updateButton}
              >
                Update Profile
              </Button>
            </View>
          </AnimatedView>

          <AnimatedView 
            entering={FadeInUp.duration(300).delay(200)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Building2 size={20} color="#6366f1" strokeWidth={2.5} />
              <Text style={styles.sectionTitle}>Your Businesses</Text>
            </View>

            <View style={styles.businessList}>
              {businesses.map((business, index) => (
                <AnimatedPressable 
                  key={business.id}
                  entering={FadeInUp.duration(400).delay(200 + index * 100)}
                  style={[styles.cardWrapper, { width: cardWidth }]}
                  onPress={() => selectBusiness(business)}
                >
                  <View style={[
                    styles.businessCard,
                    selectedBusiness?.id === business.id && styles.selectedCard
                  ]}>
                    <View style={styles.businessContent}>
                      <View style={[
                        styles.businessIcon,
                        selectedBusiness?.id === business.id && styles.selectedIcon
                      ]}>
                        <Building2 
                          size={24} 
                          color={selectedBusiness?.id === business.id ? '#ffffff' : '#6366f1'} 
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
                  </View>
                </AnimatedPressable>
              ))}
            </View>

            <Button
              mode="outlined"
              onPress={() => setModalVisible(true)}
              style={styles.addBusinessButton}
              icon={() => <Plus size={20} color="#6366f1" strokeWidth={2.5} />}
            >
              Add Business
            </Button>
          </AnimatedView>

          <AnimatedView 
            entering={FadeInUp.duration(300).delay(300)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Calendar size={20} color="#6366f1" strokeWidth={2.5} />
              <Text style={styles.sectionTitle}>Account Details</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Member Since</Text>
                <Text style={styles.detailValue}>
                  {new Date(session?.user?.created_at || '').toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last Updated</Text>
                <Text style={styles.detailValue}>
                  {new Date(session?.user?.updated_at || '').toLocaleDateString()}
                </Text>
              </View>
            </View>
          </AnimatedView>

          <AnimatedView 
            entering={FadeInUp.duration(300).delay(400)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Settings size={20} color="#6366f1" strokeWidth={2.5} />
              <Text style={styles.sectionTitle}>Preferences</Text>
            </View>

            <View style={styles.card}>
              <Pressable style={styles.menuItem}>
                <View style={styles.menuItemContent}>
                  <View style={[styles.menuIcon, { backgroundColor: '#eff6ff' }]}>
                    <Bell size={20} color="#6366f1" strokeWidth={2.5} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuTitle}>Notifications</Text>
                    <Text style={styles.menuSubtitle}>Manage notification settings</Text>
                  </View>
                  <Text style={styles.menuValue}>On</Text>
                </View>
              </Pressable>

              <Pressable style={styles.menuItem}>
                <View style={styles.menuItemContent}>
                  <View style={[styles.menuIcon, { backgroundColor: '#eff6ff' }]}>
                    <Shield size={20} color="#6366f1" strokeWidth={2.5} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuTitle}>Privacy</Text>
                    <Text style={styles.menuSubtitle}>Manage privacy settings</Text>
                  </View>
                  <Text style={styles.menuValue}>Public</Text>
                </View>
              </Pressable>
            </View>
          </AnimatedView>

          <AnimatedView 
            entering={FadeInUp.duration(300).delay(500)}
            style={styles.section}
          >
            <Button
              mode="contained"
              onPress={signOut}
              style={styles.signOutButton}
              contentStyle={styles.signOutContent}
              icon={() => <LogOut size={20} color="#ffffff" strokeWidth={2.5} />}
            >
              Sign Out
            </Button>
          </AnimatedView>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
  },
  header: {
    height: 240,
    backgroundColor: '#6366f1',
    overflow: 'hidden',
  },
  headerContent: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
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
  profileContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#e0e7ff',
    opacity: 0.8,
  },
  content: {
    flex: 1,
    marginTop: -48,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  accountGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  accountInput: {
    flex: 1,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  updateButton: {
    marginTop: 8,
    backgroundColor: '#6366f1',
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
    fontSize: 14,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  menuValue: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 24,
  },
  signOutContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  businessList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  cardWrapper: {
    width: cardWidth,
    marginBottom: 8,
  },
  businessCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    height: 56,
  },
  selectedCard: {
    borderColor: '#6366f1',
    backgroundColor: '#f8fafc',
  },
  businessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: '100%',
  },
  businessIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  selectedIcon: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  businessName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  selectedBusinessName: {
    color: '#6366f1',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  selectedText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  addBusinessButton: {
    borderColor: '#6366f1',
    marginTop: 8,
    borderRadius: 24,
  },
  modal: {
    margin: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    minWidth: 100,
    borderRadius: 24,
  },
});