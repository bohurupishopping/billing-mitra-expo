import React, { useCallback, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Platform, 
  Pressable, 
  Modal, 
  Dimensions, 
  useColorScheme,
  ScrollView // Import ScrollView
} from 'react-native';
import { Text } from 'react-native-paper'; // Keep Text from paper if needed by PaymentForm or for title
import { router } from 'expo-router';
import { X, PlusCircle } from 'lucide-react-native'; // Import necessary icons
// Removed LinearGradient and ArrowLeft
import PaymentForm from '../../components/payments/PaymentForm'; // Keep PaymentForm
import Animated, { 
  FadeInUp, // Keep FadeInUp if PaymentForm uses it, or remove if not needed
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
  withTiming,
  runOnJS 
} from 'react-native-reanimated';
// Removed useSafeAreaInsets

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;

export default function NewPaymentScreen() {
  const colorScheme = useColorScheme();
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);

  // Animation setup
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, [opacity, translateY]);

  // Dismiss handler
  const handleDismiss = useCallback(() => {
    translateY.value = withSpring(height, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(router.back)(); 
    });
  }, [router, opacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const modalStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  // Dynamic Colors
  const modalBackgroundColor = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
  // Using a slightly different accent for payments, e.g., blue
  const primaryAccentColor = '#3b82f6'; // Blue accent
  const headerBackgroundColor = colorScheme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(219, 234, 254, 0.1)'; 
  const closeButtonBackgroundColor = colorScheme === 'dark' ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)';
  const iconColor = colorScheme === 'dark' ? '#E5E7EB' : '#374151';
  const textColor = colorScheme === 'dark' ? '#F3F4F6' : '#111827';

  // Assuming PaymentForm handles its own submission/cancellation and calls router.back()
  // If not, we'd need to pass handleDismiss and potentially a submit handler down

  return (
    <Modal
      visible={true}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={styles.backdropPressable} onPress={handleDismiss} />
        </Animated.View>

        {/* Modal Container */}
        <Animated.View style={[styles.modalContainer, modalStyle]}>
          <View style={[styles.modalContent, { backgroundColor: modalBackgroundColor }]}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: headerBackgroundColor, borderBottomColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]}>
              <Pressable
                style={[styles.closeButton, { backgroundColor: closeButtonBackgroundColor }]}
                onPress={handleDismiss}
              >
                <X size={20} color={iconColor} />
              </Pressable>
              <View style={styles.headerContent}>
                <View style={[styles.headerIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <PlusCircle size={18} color={primaryAccentColor} />
                </View>
                <Text style={[styles.formTitle, { color: textColor }]}>
                  New Payment
                </Text>
              </View>
            </View>

            {/* Scrollable Content Area - Wrapping PaymentForm */}
            {/* Note: If PaymentForm is already a ScrollView, this outer one might be redundant */}
            {/* Adjust based on PaymentForm's implementation */}
            <ScrollView 
              style={styles.formScrollContent} 
              showsVerticalScrollIndicator={false}
              bounces={true}
              contentContainerStyle={styles.formScrollContentContainer}
              keyboardShouldPersistTaps="handled" 
            >
              {/* Pass handleDismiss to PaymentForm for success and cancel actions */}
              <PaymentForm 
                onCancel={handleDismiss} 
                onSuccess={handleDismiss} 
              />
            </ScrollView>
            
            {/* Footer: Omitted for now, assuming PaymentForm has its own actions */}
            {/* If needed, add a footer similar to NewPurchaseScreen */}

          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Styles adapted from NewPurchaseScreen refactor
const styles = StyleSheet.create({
  container: { 
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: { 
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdropPressable: { 
    flex: 1,
  },
  modalContainer: { 
    height: '90%', // Adjust height as needed, maybe make it dynamic?
    backgroundColor: 'transparent',
  },
  modalContent: { 
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  dragHandle: { 
    width: 36,
    height: 4,
    backgroundColor: 'rgba(156, 163, 175, 0.4)',
    borderRadius: 4,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: { 
    paddingVertical: 12, 
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: 'center', 
    position: 'relative', 
  },
  closeButton: { 
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconContainer: { 
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  formTitle: { 
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  formScrollContent: { 
    flex: 1,
  },
  formScrollContentContainer: { 
     // If PaymentForm has padding, remove it here. Otherwise, add padding:
     padding: 16, 
     paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Padding if no fixed footer
  },
  // Removed old styles: headerTitle, headerSubtitle, formContainer, backButton etc.
});
