import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Pressable } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { IndianRupee, ArrowLeft, Save, ChevronDown, User } from 'lucide-react-native'; // Added User icon
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'; // Added FadeInUp
import { LinearGradient } from 'expo-linear-gradient';
import { fetchCreditors, generatePurchaseNumber, createPurchase, updateCreditorOutstandingAmount, Creditor } from '../../../lib/api/purchases';
import SearchableSelectModal from '@/app/components/ui/SearchableSelectModal'; // Corrected path alias to include 'app'
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Import safe area hook

type FormData = {
  purchaseNumber: string;
  purchaseDate: string;
  creditorId: string;
  description: string;
  itemName: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
};

type FormErrors = Partial<Record<keyof FormData, string>> & {
  submit?: string;
};

export default function NewPurchaseScreen() {
  const router = useRouter();
  const { selectedBusiness } = useBusiness();
  const insets = useSafeAreaInsets(); // Get safe area insets
  
  const [formData, setFormData] = useState<FormData>({
    purchaseNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    creditorId: '',
    description: '',
    itemName: '',
    quantity: '1',
    unitPrice: '',
    totalPrice: '0',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [isCreditorModalVisible, setIsCreditorModalVisible] = useState(false); // State for modal visibility
  const [fetchingCreditors, setFetchingCreditors] = useState(true); // Added loading state for creditors

  useEffect(() => {
    if (selectedBusiness) {
      initializeForm();
    }
  }, [selectedBusiness]);

  useEffect(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const unitPrice = parseFloat(formData.unitPrice) || 0;
    const totalPrice = (quantity * unitPrice).toFixed(2);
    
    setFormData(prev => ({
      ...prev,
      totalPrice
    }));
  }, [formData.quantity, formData.unitPrice]);

  const initializeForm = async () => {
    if (!selectedBusiness) return;
    
    try {
      setFetchingCreditors(true); // Set loading true
      const [purchaseNumber, creditorsList] = await Promise.all([
        generatePurchaseNumber(selectedBusiness.id),
        fetchCreditors(selectedBusiness.id)
      ]);
      
      setFormData(prev => ({ ...prev, purchaseNumber }));
      setCreditors(creditorsList);
    } catch (err) {
      console.error('Error initializing form:', err);
      setErrors(prev => ({ ...prev, submit: 'Failed to initialize form' }));
    }
    finally {
      setFetchingCreditors(false); // Set loading false
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    if (!formData.purchaseNumber.trim()) {
      newErrors.purchaseNumber = 'Purchase number is required';
    }
    
    if (!formData.purchaseDate.trim()) {
      newErrors.purchaseDate = 'Purchase date is required';
    }
    
    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }
    
    if (!formData.quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else {
      const quantity = parseFloat(formData.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        newErrors.quantity = 'Quantity must be a positive number';
      }
    }
    
    if (!formData.unitPrice.trim()) {
      newErrors.unitPrice = 'Unit price is required';
    } else {
      const unitPrice = parseFloat(formData.unitPrice);
      if (isNaN(unitPrice) || unitPrice <= 0) {
        newErrors.unitPrice = 'Unit price must be a positive number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedBusiness) return;
    
    setLoading(true);
    
    try {
      const purchase = await createPurchase({
        business_id: selectedBusiness.id,
        purchase_number: formData.purchaseNumber,
        purchase_date: formData.purchaseDate,
        creditor_id: formData.creditorId || null,
        description: formData.description || null,
        item_name: formData.itemName,
        quantity: parseFloat(formData.quantity),
        unit_price: parseFloat(formData.unitPrice),
        total_price: parseFloat(formData.totalPrice)
      });
      
      if (formData.creditorId) {
        const creditor = creditors.find(c => c.id === formData.creditorId);
        if (creditor) {
          const newOutstandingAmount = Number(creditor.outstanding_amount) + parseFloat(formData.totalPrice);
          await updateCreditorOutstandingAmount(formData.creditorId, newOutstandingAmount);
        }
      }
      
      router.replace('/purchases');
    } catch (err) {
      console.error('Error creating purchase:', err);
      setErrors(prev => ({ ...prev, submit: 'Failed to create purchase' }));
    } finally {
      setLoading(false);
    }
  };

  const selectedCreditor = creditors.find(c => c.id === formData.creditorId);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e40af', '#1e3a8a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]} // Use safe area inset
      >
        <View style={styles.headerContent}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={10}
            aria-label="Go back"
          >
            <ArrowLeft size={24} color="#ffffff" />
          </Pressable>
          <View style={styles.headerText}>
            <Text variant="titleLarge" style={styles.title}>New Purchase</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Record a new purchase transaction
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={styles.form} entering={FadeInUp.duration(400).delay(100)}>
          <Animated.View entering={FadeInDown.duration(300).delay(100)}>
            <TextInput
              mode="outlined"
              label="Purchase Number"
              value={formData.purchaseNumber}
              onChangeText={(text) => setFormData(prev => ({ ...prev, purchaseNumber: text }))}
              error={!!errors.purchaseNumber}
              style={styles.input}
            />
            {errors.purchaseNumber && (
              <HelperText type="error">{errors.purchaseNumber}</HelperText>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(300).delay(200)}>
            <TextInput
              mode="outlined"
              label="Purchase Date"
              value={formData.purchaseDate}
              onChangeText={(text) => setFormData(prev => ({ ...prev, purchaseDate: text }))}
              error={!!errors.purchaseDate}
              style={styles.input}
            />
            {errors.purchaseDate && (
              <HelperText type="error">{errors.purchaseDate}</HelperText>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(300).delay(300)}>
            <Button
              mode="outlined"
              onPress={() => setIsCreditorModalVisible(true)}
              style={styles.selectButton}
              contentStyle={styles.selectButtonContent}
              labelStyle={styles.selectButtonLabel}
              disabled={fetchingCreditors}
              icon={() => <User size={18} color="#64748b" />}
            >
              {selectedCreditor ? selectedCreditor.name : 'Select Supplier (Optional)'}
            </Button>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(300).delay(400)}>
            <TextInput
              mode="outlined"
              label="Item Name"
              value={formData.itemName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, itemName: text }))}
              error={!!errors.itemName}
              style={styles.input}
            />
            {errors.itemName && (
              <HelperText type="error">{errors.itemName}</HelperText>
            )}
          </Animated.View>

          <View style={styles.row}>
            <Animated.View entering={FadeInDown.duration(300).delay(500)} style={styles.flex1}>
              <TextInput
                mode="outlined"
                label="Quantity"
                value={formData.quantity}
                onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                error={!!errors.quantity}
                keyboardType="numeric"
                style={styles.input}
              />
              {errors.quantity && (
                <HelperText type="error">{errors.quantity}</HelperText>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(300).delay(600)} style={styles.flex1}>
              <TextInput
                mode="outlined"
                label="Unit Price"
                value={formData.unitPrice}
                onChangeText={(text) => setFormData(prev => ({ ...prev, unitPrice: text }))}
                error={!!errors.unitPrice}
                keyboardType="numeric"
                left={<TextInput.Icon icon={() => <IndianRupee size={20} color="#64748b" />} />}
                style={styles.input}
              />
              {errors.unitPrice && (
                <HelperText type="error">{errors.unitPrice}</HelperText>
              )}
            </Animated.View>
          </View>

          <Animated.View entering={FadeInDown.duration(300).delay(700)}>
            <TextInput
              mode="outlined"
              label="Total Price"
              value={formData.totalPrice}
              left={<TextInput.Icon icon={() => <IndianRupee size={20} color="#64748b" />} />}
              disabled
              style={styles.input}
            />
            <Text style={styles.helperText}>
              Automatically calculated based on quantity and unit price
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(300).delay(800)}>
            <TextInput
              mode="outlined"
              label="Description (Optional)"
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={4}
              style={styles.input}
            />
          </Animated.View>

          {errors.submit && (
            <Text style={styles.errorText}>{errors.submit}</Text>
          )}

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              style={styles.button}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.button}
              icon={() => <Save size={20} color="#ffffff" />}
            >
              Create Purchase
            </Button>
          </View>
        </Animated.View> {/* End Form Animated.View */}
      </ScrollView>

      {/* Creditor Selection Modal */}
      <SearchableSelectModal
        visible={isCreditorModalVisible}
        onDismiss={() => setIsCreditorModalVisible(false)}
        items={creditors}
        onSelect={(creditor: Creditor | null) => {
          setFormData(prev => ({ ...prev, creditorId: creditor?.id || '' }));
          setIsCreditorModalVisible(false);
        }}
        title="Select Supplier"
        labelKey="name"
        descriptionKey={(item: Creditor) => `Outstanding: ₹${item.outstanding_amount.toLocaleString()}`}
        searchKeys={['name']}
        loading={fetchingCreditors}
        allowClear={true}
        clearLabel="No Supplier"
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
    paddingHorizontal: 16,
    paddingBottom: 20, // Increased bottom padding
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
  },
  title: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#ffffff',
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  input: {
    marginBottom: 16, // Increased spacing between inputs
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: -4,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  button: {
    minWidth: 120,
  },
  creditorButton: {
    // Styles replaced by selectButton styles
  },
  chevron: {
    // Styles replaced by selectButton styles
  },
  selectButton: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    height: 56,
    justifyContent: 'center',
    marginBottom: 16, // Match input spacing
  },
  selectButtonContent: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: '100%',
  },
  selectButtonLabel: {
    fontSize: 16,
    color: '#1e293b',
    textAlign: 'left',
    flex: 1,
  },
});