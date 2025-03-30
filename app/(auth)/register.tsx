import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Text, TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Mail, Lock } from 'lucide-react-native';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function RegisterScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await signUp(email, password);
      router.replace('/(app)');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.outerContainer}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AnimatedView entering={FadeInDown.duration(600)} style={styles.header}>
           <Image
            source={{ uri: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80' }} // Using same background pattern
            style={[StyleSheet.absoluteFillObject, { opacity: 0.9 }]}
            blurRadius={70}
          />
          <Text style={styles.headerTitle}>Get Started</Text>
          <Text style={styles.headerSubtitle}>Create your BillingMitra account</Text>
        </AnimatedView>
        
        <AnimatedView entering={FadeInUp.duration(500).delay(200)} style={styles.formContainer}>
          <Text variant="headlineMedium" style={styles.title}>Register</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Fill in the details below</Text>

          <TextInput
            mode="outlined"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            left={<TextInput.Icon icon={() => <Mail size={20} color={theme.colors.onSurfaceVariant} />} />}
            outlineStyle={styles.inputOutline}
          />

          <TextInput
            mode="outlined"
            label="Password"
            placeholder="Choose a strong password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            left={<TextInput.Icon icon={() => <Lock size={20} color={theme.colors.onSurfaceVariant} />} />}
            right={<TextInput.Icon icon="eye" onPress={() => { /* Toggle visibility */ }} />}
            outlineStyle={styles.inputOutline}
          />

          <TextInput
            mode="outlined"
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={styles.input}
            left={<TextInput.Icon icon={() => <Lock size={20} color={theme.colors.onSurfaceVariant} />} />}
            right={<TextInput.Icon icon="eye" onPress={() => { /* Toggle visibility */ }} />}
            outlineStyle={styles.inputOutline}
          />

          <HelperText type="error" visible={!!error} style={styles.errorText}>
            {error}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Create Account
          </Button>

          <View style={styles.linksContainer}>
            <Link href="/login" asChild>
              <Pressable>
                 <Text style={styles.linkText}>Already have an account? <Text style={{color: theme.colors.primary, fontWeight: '600'}}>Sign In</Text></Text>
              </Pressable>
            </Link>
          </View>
        </AnimatedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Reusing styles from login.tsx for consistency
const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#f8fafc', // Light background
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1', // Primary color from index
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff', // Light text color from index
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 32,
    marginTop: -30, // Overlap header slightly
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 6,
  },
  title: {
    fontWeight: '700', // Bolder
    textAlign: 'center',
    marginBottom: 8,
    color: '#1e293b', // Darker text
  },
  subtitle: {
    textAlign: 'center',
    color: '#64748b', // Subdued text color from index
    marginBottom: 32, // More space
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#f8fafc', // Slightly off-white background for input
  },
  inputOutline: {
    borderRadius: 12, // Rounded corners for inputs
    borderWidth: 1,
  },
  errorText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
    paddingVertical: 10, // More padding
    borderRadius: 12, // Rounded corners
    backgroundColor: '#6366f1', // Match header color
  },
  buttonLabel: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  linksContainer: {
    alignItems: 'center', // Center the single link
    marginTop: 24,
    paddingHorizontal: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
});
