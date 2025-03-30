import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PaymentForm } from '../../components/payments/PaymentForm';

export default function NewPaymentScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4f46e5', '#4338ca']}
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
            <Text style={styles.headerTitle}>New Payment</Text>
            <Text style={styles.headerSubtitle}>
              Create a new payment record
            </Text>
          </View>
        </View>
      </LinearGradient>

      <PaymentForm />
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
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
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
});