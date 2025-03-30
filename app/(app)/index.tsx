import React from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, Pressable } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { Building2, Receipt, CreditCard, TrendingUp, Users, Package, ArrowRight, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

const { width } = Dimensions.get('window');
const isTablet = width > 768;
const cardWidth = isTablet ? (width - 48) / 3 : (width - 32) / 2;

export default function HomeScreen() {
  const { session } = useAuth();
  const { selectedBusiness } = useBusiness();

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
              <Wallet size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.titleWrapper}>
              <Text style={styles.headerTitle}>Dashboard</Text>
              <Text style={styles.headerSubtitle}>
                Welcome back{session?.user?.email ? `, ${session.user.email.split('@')[0]}` : ''}!
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <ArrowUpRight size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Income</Text>
              <Text style={styles.statValue}>₹45,000</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <ArrowDownRight size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Expenses</Text>
              <Text style={styles.statValue}>₹28,000</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <TrendingUp size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Net Profit</Text>
              <Text style={styles.statValue}>₹17,000</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.cardGrid}>
            <AnimatedView 
              entering={FadeInUp.duration(300).delay(100)}
              style={[styles.cardWrapper, { width: cardWidth }]}
            >
              <Pressable 
                style={styles.actionCard}
                onPress={() => router.push('/businesses')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#eff6ff' }]}>
                  <Building2 size={24} color="#2563EB" strokeWidth={2.5} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Businesses</Text>
                  <Text style={styles.actionSubtitle}>Manage your companies</Text>
                </View>
                <ArrowRight size={20} color="#2563EB" style={styles.actionArrow} />
              </Pressable>
            </AnimatedView>

            <AnimatedView 
              entering={FadeInUp.duration(300).delay(200)}
              style={[styles.cardWrapper, { width: cardWidth }]}
            >
              <Pressable 
                style={styles.actionCard}
                onPress={() => router.push('/purchases')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Receipt size={24} color="#16a34a" strokeWidth={2.5} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Purchases</Text>
                  <Text style={styles.actionSubtitle}>Track your expenses</Text>
                </View>
                <ArrowRight size={20} color="#16a34a" style={styles.actionArrow} />
              </Pressable>
            </AnimatedView>

            <AnimatedView 
              entering={FadeInUp.duration(300).delay(300)}
              style={[styles.cardWrapper, { width: cardWidth }]}
            >
              <Pressable 
                style={styles.actionCard}
                onPress={() => router.push('/finances')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                  <CreditCard size={24} color="#d97706" strokeWidth={2.5} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Finances</Text>
                  <Text style={styles.actionSubtitle}>Monitor cash flow</Text>
                </View>
                <ArrowRight size={20} color="#d97706" style={styles.actionArrow} />
              </Pressable>
            </AnimatedView>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Overview</Text>
          <View style={styles.overviewGrid}>
            <AnimatedView 
              entering={FadeInUp.duration(300).delay(400)}
              style={[styles.overviewCard, { backgroundColor: '#eff6ff' }]}
            >
              <View style={[styles.overviewIcon, { backgroundColor: '#dbeafe' }]}>
                <Users size={24} color="#2563eb" strokeWidth={2.5} />
              </View>
              <View style={styles.overviewContent}>
                <Text style={styles.overviewValue}>28</Text>
                <Text style={styles.overviewLabel}>Total Customers</Text>
              </View>
            </AnimatedView>

            <AnimatedView 
              entering={FadeInUp.duration(300).delay(500)}
              style={[styles.overviewCard, { backgroundColor: '#f0fdf4' }]}
            >
              <View style={[styles.overviewIcon, { backgroundColor: '#dcfce7' }]}>
                <Package size={24} color="#16a34a" strokeWidth={2.5} />
              </View>
              <View style={styles.overviewContent}>
                <Text style={styles.overviewValue}>156</Text>
                <Text style={styles.overviewLabel}>Total Products</Text>
              </View>
            </AnimatedView>
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  actionArrow: {
    marginLeft: 8,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    minWidth: cardWidth,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewContent: {
    gap: 2,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#64748b',
  },
});