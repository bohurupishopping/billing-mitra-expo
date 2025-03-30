import React from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PaymentForm from '../../components/payments/PaymentForm';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NewPaymentScreen() {
  const insets = useSafeAreaInsets(); // Get safe area insets

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4f46e5', '#4338ca']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]} // Use safe area top inset + padding
      >
        <View style={styles.headerContent}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={10} // Increase touch area
            aria-label="Go back"
          >
            <ArrowLeft size={24} color="#ffffff" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>New Payment</Text>
            <Text style={styles.headerSubtitle}>
              Create a new payment record
            </Text>
          </View>
        </View>
      </LinearGradient>

      <Animated.View style={styles.formContainer} entering={FadeInUp.duration(400).delay(100)}>
        <PaymentForm />
      </Animated.View>
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
    paddingBottom: 20, // Increased bottom padding slightly
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
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    letterSpacing: 0.3,
  },
  formContainer: {
    flex: 1, // Ensure the form container takes remaining space
  },
});