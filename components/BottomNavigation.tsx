import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, usePathname } from 'expo-router';
import { Chrome as Home, Building2, CreditCard, Receipt, Wallet, User, Users } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Route = {
  name: string;
  path: string;
  icon: React.ElementType;
};

const routes: Route[] = [
  {
    name: 'Home',
    path: '/',
    icon: Home,
  },
  {
    name: 'Creditors',
    path: '/contacts/creditors',
    icon: Users,
  },
  {
    name: 'Payments',
    path: '/payments',
    icon: CreditCard,
  },
  {
    name: 'Purchases',
    path: '/purchases',
    icon: Receipt,
  },
  {
    name: 'Finances',
    path: '/finances',
    icon: Wallet,
  },
  {
    name: 'Profile',
    path: '/profile',
    icon: User,
  },
];

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Animated.View 
      entering={FadeIn.duration(1000).springify()}
      style={styles.container}
    >
      <View style={styles.background} />
      <View style={styles.content}>
        {routes.map((route) => {
          const isActive = pathname === route.path;
          
          return (
            <AnimatedPressable
              key={route.name}
              style={styles.tab}
              onPress={() => router.push(route.path as any)}>
              <View style={[
                styles.iconContainer,
                isActive && styles.activeIconContainer
              ]}>
                <route.icon
                  size={24}
                  color={isActive ? '#2563EB' : '#64748B'}
                  strokeWidth={2}
                />
              </View>
              <Text
                variant="labelSmall"
                style={[
                  styles.label,
                  isActive && styles.activeLabel
                ]}
              >
                {route.name}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    zIndex: 100,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeIconContainer: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  label: {
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  activeLabel: {
    color: '#2563EB',
    fontWeight: '700',
  },
});