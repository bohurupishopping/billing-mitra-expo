import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, Pressable, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { CreditCard, Receipt, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { width } = Dimensions.get('window');
const isTablet = width > 768;
const cardWidth = isTablet ? (width - 48) / 3 : (width - 32) / 2;

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

export default function HomeScreen() {
  const { session } = useAuth();
  const { selectedBusiness } = useBusiness();
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedBusiness) {
      fetchRecentPurchases();
    }
  }, [selectedBusiness]);

  const fetchRecentPurchases = async () => {
    if (!selectedBusiness) return;

    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, creditors(name)')
        .eq('business_id', selectedBusiness.id)
        .order('purchase_date', { ascending: false })
        .limit(4);

      if (error) throw error;
      setRecentPurchases(data || []);
    } catch (err) {
      console.error('Error fetching recent purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'New Payment',
      description: 'Record a new payment',
      icon: CreditCard,
      route: '/payments/new' as const,
      color: '#818cf8',
      gradient: ['#818cf8', '#6366f1'],
    },
    {
      title: 'New Purchase',
      description: 'Record a new purchase',
      icon: Receipt,
      route: '/purchases/new' as const,
      color: '#fb923c',
      gradient: ['#fb923c', '#f97316'],
    },
  ];

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
            style={styles.welcomeContainer}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{session?.user?.email?.split('@')[0] || 'User'}</Text>
            <View style={styles.roleContainer}>
              <Text style={styles.role}>Business Dashboard</Text>
            </View>
          </Animated.View>
        </View>

        <View style={styles.content}>
          <View style={styles.quickActions}>
            
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <AnimatedPressable
                  key={action.title}
                  entering={FadeInUp.duration(400).delay(200 + index * 100)}
                  style={[styles.quickActionCard, { borderColor: `${action.color}20` }]}
                  onPress={() => router.push(action.route)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                    <action.icon size={26} color={action.color} strokeWidth={2} />
                  </View>
                  <Text style={[styles.quickActionTitle, { color: action.gradient[1] }]}>{action.title}</Text>
                  <Text style={styles.quickActionDescription}>{action.description}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          <View style={styles.recentPurchases}>
            <Text style={styles.sectionTitle}>Recent Purchases</Text>
            <View style={styles.purchasesList}>
              {recentPurchases.map((purchase, index) => (
                <AnimatedPressable
                  key={purchase.id}
                  entering={FadeInUp.duration(400).delay(400 + index * 100)}
                  style={styles.purchaseCard}
                  onPress={() => router.push(`/purchases/${purchase.id}`)}
                >
                  <View style={styles.purchaseContent}>
                    <View style={styles.purchaseInfo}>
                      <Text style={styles.purchaseItem}>{purchase.item_name}</Text>
                      <Text style={styles.purchaseDate}>
                        {format(new Date(purchase.purchase_date), 'MMM dd, yyyy')}
                      </Text>
                    </View>
                    <View style={styles.purchaseAmount}>
                      <Text style={styles.amountText}>₹{purchase.total_price.toLocaleString()}</Text>
                      <ChevronRight size={16} color="#64748b" />
                    </View>
                  </View>
                </AnimatedPressable>
              ))}
              {recentPurchases.length === 0 && !loading && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No recent purchases</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
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
    height: 200,
    backgroundColor: '#6366f1',
    overflow: 'hidden',
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
  },
  greeting: {
    fontSize: 16,
    color: '#e0e7ff',
    marginBottom: 8,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  roleContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  role: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    marginTop: -32,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
    marginTop: 16,
  },
  quickActions: {
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  quickActionDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  recentPurchases: {
    marginBottom: 16,
  },
  purchasesList: {
    gap: 8,
  },
  purchaseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  purchaseContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  purchaseInfo: {
    flex: 1,
    gap: 4,
  },
  purchaseItem: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  purchaseDate: {
    fontSize: 13,
    color: '#64748b',
  },
  purchaseAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e40af',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
});