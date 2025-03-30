import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  Pressable, 
  Modal, 
  Dimensions, 
  useColorScheme,
  FlatList // Import FlatList
} from 'react-native';
import { Text, TextInput, Button, HelperText, Searchbar, List, Divider, ActivityIndicator } from 'react-native-paper'; // Import Paper components
import { useRouter } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { IndianRupee, Save, User, X, PlusCircle, ArrowLeft } from 'lucide-react-native'; // Updated icons
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
  withTiming,
  runOnJS 
} from 'react-native-reanimated';
import { fetchCreditors, generatePurchaseNumber, createPurchase, updateCreditorOutstandingAmount, Creditor } from '../../../lib/api/purchases';
// Removed SearchableSelectModal import

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;

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
  const colorScheme = useColorScheme();
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);
  
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
  const [isCreditorSelectionVisible, setIsCreditorSelectionVisible] = useState(false); // State to toggle inline view
  const [fetchingCreditors, setFetchingCreditors] = useState(true); 
  const [creditorSearchQuery, setCreditorSearchQuery] = useState(''); // State for inline search

  // Animation setup
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, [opacity, translateY]);

  const handleDismiss = useCallback(() => {
    translateY.value = withSpring(height, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(router.back)(); 
    });
  }, [router, opacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const modalStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  // Form Initialization and Data Fetching
  useEffect(() => {
    if (selectedBusiness) {
      initializeForm();
    }
  }, [selectedBusiness]);

  useEffect(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const unitPrice = parseFloat(formData.unitPrice) || 0;
    const totalPrice = (quantity * unitPrice).toFixed(2);
    setFormData(prev => ({ ...prev, totalPrice }));
  }, [formData.quantity, formData.unitPrice]);

  const initializeForm = async () => {
    if (!selectedBusiness) return;
    setFetchingCreditors(true);
    try {
      const [purchaseNumber, creditorsList] = await Promise.all([
        generatePurchaseNumber(selectedBusiness.id),
        fetchCreditors(selectedBusiness.id)
      ]);
      setFormData(prev => ({ ...prev, purchaseNumber }));
      setCreditors(creditorsList);
    } catch (err) {
      console.error('Error initializing form:', err);
      setErrors(prev => ({ ...prev, submit: 'Failed to initialize form' }));
    } finally {
      setFetchingCreditors(false);
    }
  };

  // Form Validation
  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!formData.purchaseNumber.trim()) newErrors.purchaseNumber = 'Purchase number is required';
    if (!formData.purchaseDate.trim()) newErrors.purchaseDate = 'Purchase date is required';
    if (!formData.itemName.trim()) newErrors.itemName = 'Item name is required';
    if (!formData.quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else {
      const quantity = parseFloat(formData.quantity);
      if (isNaN(quantity) || quantity <= 0) newErrors.quantity = 'Quantity must be a positive number';
    }
    if (!formData.unitPrice.trim()) {
      newErrors.unitPrice = 'Unit price is required';
    } else {
      const unitPrice = parseFloat(formData.unitPrice);
      if (isNaN(unitPrice) || unitPrice <= 0) newErrors.unitPrice = 'Unit price must be a positive number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submission
  const handleSubmit = async () => {
    if (!validateForm() || !selectedBusiness) return;
    setLoading(true);
    try {
      await createPurchase({
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
          const newOutstandingAmount = Number(creditor.outstanding_amount || 0) + parseFloat(formData.totalPrice);
          await updateCreditorOutstandingAmount(formData.creditorId, newOutstandingAmount);
        }
      }
      handleDismiss(); 
    } catch (err) {
      console.error('Error creating purchase:', err);
      setErrors(prev => ({ ...prev, submit: 'Failed to create purchase' }));
    } finally {
      setLoading(false);
    }
  };

  const selectedCreditor = creditors.find(c => c.id === formData.creditorId);

  // --- Creditor Selection Logic (Inline) ---
  const getDisplayValue = (item: Creditor, key: keyof Creditor | ((item: Creditor) => string) | undefined): string | undefined => {
    if (!key) return undefined;
    if (typeof key === 'function') return key(item);
    return item[key as keyof Creditor]?.toString();
  };
  
  const filteredCreditors = useMemo(() => {
    if (!creditorSearchQuery) return creditors;
    const lowerCaseQuery = creditorSearchQuery.toLowerCase();
    const searchKeys: (keyof Creditor)[] = ['name', 'phone', 'email']; 
    return creditors.filter(item =>
      searchKeys.some(key => {
        const value = item[key as keyof Creditor];
        return value && value.toString().toLowerCase().includes(lowerCaseQuery);
      })
    );
  }, [creditors, creditorSearchQuery]);

  const handleCreditorSelect = (creditor: Creditor | null) => {
    setFormData(prev => ({ ...prev, creditorId: creditor?.id || '' }));
    setCreditorSearchQuery(''); 
    setIsCreditorSelectionVisible(false); // Go back to form view
  };

  const renderCreditorItem = ({ item }: { item: Creditor }) => (
    <List.Item
      title={getDisplayValue(item, 'name')}
      description={`Outstanding: ₹${item.outstanding_amount?.toLocaleString() ?? '0'}`}
      onPress={() => handleCreditorSelect(item)}
      titleStyle={styles.itemTitle}
      descriptionStyle={styles.itemDescription}
    />
  );
  // --- End Creditor Selection Logic ---

  // Dynamic Colors
  const modalBackgroundColor = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
  const headerBackgroundColor = colorScheme === 'dark' ? 'rgba(76, 29, 149, 0.1)' : 'rgba(233, 213, 255, 0.1)';
  const closeButtonBackgroundColor = colorScheme === 'dark' ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)';
  const iconColor = colorScheme === 'dark' ? '#E5E7EB' : '#374151';
  const primaryAccentColor = '#7c3aed';
  const textColor = colorScheme === 'dark' ? '#F3F4F6' : '#111827';
  const inputBackgroundColor = colorScheme === 'dark' ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.7)'; // Adjusted input background
  const inputBorderColor = colorScheme === 'dark' ? 'rgba(75, 85, 99, 0.6)' : 'rgba(209, 213, 219, 0.8)';
  const searchbarBg = colorScheme === 'dark' ? '#374151' : '#f1f5f9';

  return (
    <Modal
      visible={true}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={styles.backdropPressable} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View style={[styles.modalContainer, modalStyle]}>
          <View style={[styles.modalContent, { backgroundColor: modalBackgroundColor }]}>
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
                <View style={[styles.headerIconContainer, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
                  <PlusCircle size={18} color={primaryAccentColor} />
                </View>
                <Text style={[styles.formTitle, { color: textColor }]}>
                  New Purchase
                </Text>
              </View>
            </View>

            {/* Scrollable Content Area */}
            <ScrollView 
              style={styles.formScrollContent} 
              showsVerticalScrollIndicator={false}
              bounces={true}
              contentContainerStyle={styles.formScrollContentContainer}
              keyboardShouldPersistTaps="handled" // Keep keyboard open when tapping list items
            >
              {/* Conditionally render Form or Creditor Selection */}
              {isCreditorSelectionVisible ? (
                 // --- Creditor Selection View ---
                 <View>
                   <View style={styles.selectionHeader}>
                     <Button 
                       icon={() => <ArrowLeft size={20} color={primaryAccentColor} />} 
                       onPress={() => setIsCreditorSelectionVisible(false)}
                       compact
                       mode="text" // Use text mode for less emphasis
                       style={styles.backButton}
                       labelStyle={{ color: primaryAccentColor }}
                     >
                       Back
                     </Button>
                     <Text style={[styles.selectionTitle, { color: textColor }]}>Select Supplier</Text>
                     <View style={{ width: 60 }} /> {/* Spacer to balance title */}
                   </View>
                   <Searchbar
                     placeholder="Search Suppliers..."
                     onChangeText={setCreditorSearchQuery}
                     value={creditorSearchQuery}
                     style={[styles.searchbar, { backgroundColor: searchbarBg }]}
                     inputStyle={[styles.searchInput, { color: textColor }]}
                     iconColor={primaryAccentColor}
                     placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                     elevation={0}
                   />
                   {fetchingCreditors ? (
                     <View style={styles.loadingContainer}>
                       <ActivityIndicator animating={true} size="large" color={primaryAccentColor} />
                     </View>
                   ) : (
                     <FlatList
                       data={filteredCreditors}
                       renderItem={renderCreditorItem}
                       keyExtractor={(item) => item.id.toString()}
                       ItemSeparatorComponent={() => <Divider style={[styles.divider, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#e2e8f0' }]} />}
                       ListEmptyComponent={
                         <View style={styles.emptyContainer}>
                           <Text style={[styles.emptyText, { color: colorScheme === 'dark' ? '#9CA3AF' : '#64748b' }]}>No suppliers found.</Text>
                         </View>
                       }
                       ListHeaderComponent={(
                         <>
                           <List.Item
                             title="No Supplier"
                             onPress={() => handleCreditorSelect(null)}
                             titleStyle={[styles.itemTitle, styles.clearItem, { color: primaryAccentColor }]}
                           />
                           <Divider style={[styles.divider, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#e2e8f0' }]} />
                         </>
                       )}
                       style={styles.list}
                       scrollEnabled={false} // Important: Prevent nested scrolling issues
                     />
                   )}
                 </View>
              ) : (
                // --- Main Form View ---
                <Animated.View> 
                  {/* Purchase Number */}
                  <Animated.View entering={FadeInDown.duration(300).delay(100)}>
                    <TextInput
                      mode="outlined"
                      label="Purchase Number"
                      value={formData.purchaseNumber}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, purchaseNumber: text }))}
                      error={!!errors.purchaseNumber}
                      style={[styles.input, { backgroundColor: inputBackgroundColor }]}
                      outlineColor={inputBorderColor}
                      activeOutlineColor={primaryAccentColor}
                      textColor={textColor}
                    />
                    {errors.purchaseNumber && <HelperText type="error">{errors.purchaseNumber}</HelperText>}
                  </Animated.View>

                  {/* Purchase Date */}
                  <Animated.View entering={FadeInDown.duration(300).delay(200)}>
                    <TextInput
                      mode="outlined"
                      label="Purchase Date"
                      value={formData.purchaseDate}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, purchaseDate: text }))}
                      error={!!errors.purchaseDate}
                      style={[styles.input, { backgroundColor: inputBackgroundColor }]}
                      outlineColor={inputBorderColor}
                      activeOutlineColor={primaryAccentColor}
                      textColor={textColor}
                      // Consider adding a Date Picker here
                    />
                    {errors.purchaseDate && <HelperText type="error">{errors.purchaseDate}</HelperText>}
                  </Animated.View>

                  {/* Supplier Select Button */}
                  <Animated.View entering={FadeInDown.duration(300).delay(300)}>
                    <Button
                      mode="outlined"
                      onPress={() => setIsCreditorSelectionVisible(true)}
                      style={[styles.selectButton, { borderColor: inputBorderColor }]}
                      contentStyle={styles.selectButtonContent}
                      labelStyle={[styles.selectButtonLabel, { color: selectedCreditor ? textColor : (colorScheme === 'dark' ? '#9CA3AF' : '#6B7280') }]}
                      disabled={fetchingCreditors}
                      icon={() => <User size={18} color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'} />}
                    >
                      {selectedCreditor ? selectedCreditor.name : 'Select Supplier (Optional)'}
                    </Button>
                  </Animated.View>

                  {/* Item Name */}
                  <Animated.View entering={FadeInDown.duration(300).delay(400)}>
                    <TextInput
                      mode="outlined"
                      label="Item Name"
                      value={formData.itemName}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, itemName: text }))}
                      error={!!errors.itemName}
                      style={[styles.input, { backgroundColor: inputBackgroundColor }]}
                      outlineColor={inputBorderColor}
                      activeOutlineColor={primaryAccentColor}
                      textColor={textColor}
                    />
                    {errors.itemName && <HelperText type="error">{errors.itemName}</HelperText>}
                  </Animated.View>

                  {/* Quantity & Unit Price Row */}
                  <View style={styles.row}>
                    <Animated.View entering={FadeInDown.duration(300).delay(500)} style={styles.flex1}>
                      <TextInput
                        mode="outlined"
                        label="Quantity"
                        value={formData.quantity}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                        error={!!errors.quantity}
                        keyboardType="numeric"
                        style={[styles.input, { backgroundColor: inputBackgroundColor }]}
                        outlineColor={inputBorderColor}
                        activeOutlineColor={primaryAccentColor}
                        textColor={textColor}
                      />
                      {errors.quantity && <HelperText type="error">{errors.quantity}</HelperText>}
                    </Animated.View>
                    <Animated.View entering={FadeInDown.duration(300).delay(600)} style={styles.flex1}>
                      <TextInput
                        mode="outlined"
                        label="Unit Price"
                        value={formData.unitPrice}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, unitPrice: text }))}
                        error={!!errors.unitPrice}
                        keyboardType="numeric"
                        left={<TextInput.Icon icon={() => <IndianRupee size={20} color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'} />} />}
                        style={[styles.input, { backgroundColor: inputBackgroundColor }]}
                        outlineColor={inputBorderColor}
                        activeOutlineColor={primaryAccentColor}
                        textColor={textColor}
                      />
                      {errors.unitPrice && <HelperText type="error">{errors.unitPrice}</HelperText>}
                    </Animated.View>
                  </View>

                  {/* Total Price */}
                  <Animated.View entering={FadeInDown.duration(300).delay(700)}>
                    <TextInput
                      mode="outlined"
                      label="Total Price"
                      value={formData.totalPrice}
                      left={<TextInput.Icon icon={() => <IndianRupee size={20} color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'} />} />}
                      disabled
                      style={[styles.input, { backgroundColor: inputBackgroundColor }]}
                       outlineColor={inputBorderColor}
                       activeOutlineColor={primaryAccentColor}
                       textColor={textColor}
                       // Removed invalid disabledTextColor prop
                     />
                     <Text style={[styles.helperText, { color: colorScheme === 'dark' ? '#9CA3AF' : '#64748b' }]}>
                       Automatically calculated
                    </Text>
                  </Animated.View>

                  {/* Description */}
                  <Animated.View entering={FadeInDown.duration(300).delay(800)}>
                    <TextInput
                      mode="outlined"
                      label="Description (Optional)"
                      value={formData.description}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                      multiline
                      numberOfLines={3} // Reduced lines slightly
                      style={[styles.input, { backgroundColor: inputBackgroundColor, height: 'auto', minHeight: 80 }]} // Auto height
                      outlineColor={inputBorderColor}
                      activeOutlineColor={primaryAccentColor}
                      textColor={textColor}
                    />
                  </Animated.View>

                  {/* Submit Error */}
                  {errors.submit && <Text style={styles.errorText}>{errors.submit}</Text>}
                </Animated.View> 
              )} 
            </ScrollView>

            {/* Footer with Actions (Only show if form is visible) */}
            {!isCreditorSelectionVisible && (
              <View style={[styles.footer, { borderTopColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb', backgroundColor: modalBackgroundColor }]}>
                <Button
                  mode="outlined"
                  onPress={handleDismiss}
                  style={[styles.button, styles.cancelButton, { borderColor: colorScheme === 'dark' ? '#6B7280' : '#D1D5DB' }]}
                  labelStyle={[styles.cancelButtonLabel, { color: colorScheme === 'dark' ? '#D1D5DB' : '#4B5563' }]}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={loading}
                  style={[styles.button, styles.submitButton, { backgroundColor: primaryAccentColor }]}
                  icon={() => <Save size={18} color="#ffffff" />}
                  labelStyle={styles.submitButtonLabel}
                >
                  Create Purchase
                </Button>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
      {/* Removed the separate SearchableSelectModal component */}
    </Modal>
  );
}

// Adapted and merged styles
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
    height: '90%', 
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
    paddingVertical: 12, // Increased padding slightly
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
     padding: 16,
     paddingBottom: Platform.OS === 'ios' ? 90 : 80, // Ensure content doesn't hide behind footer
  },
  input: { 
    marginBottom: 16, 
    // backgroundColor set dynamically
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
    marginTop: -8, // Pull helper text closer
    marginBottom: 16,
    paddingHorizontal: 8, // Add some horizontal padding
  },
  errorText: { 
    color: '#ef4444', 
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  footer: { 
    flexDirection: 'row',
    justifyContent: 'space-between', // Space out buttons
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, // More padding for safe area
    borderTopWidth: 1,
    position: 'absolute', // Make footer fixed
    bottom: 0,
    left: 0,
    right: 0,
  },
  button: { 
     flex: 1, 
     // Removed maxWidth to let them space out
  },
  cancelButton: { 
    // borderColor set dynamically
  },
  cancelButtonLabel: { 
    // color set dynamically
  },
  submitButton: { 
     // backgroundColor set dynamically
  },
  submitButtonLabel: { 
     color: '#ffffff', 
     fontWeight: '600',
  },
  selectButton: { 
    // backgroundColor set dynamically
    // borderColor set dynamically
    height: 56, 
    justifyContent: 'center',
    marginBottom: 16, 
    borderWidth: 1, 
    borderRadius: 4, // Match TextInput outline border radius
  },
  selectButtonContent: { 
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: '100%',
  },
  selectButtonLabel: { 
    fontSize: 16,
    // color set dynamically
    textAlign: 'left',
    flex: 1,
    marginLeft: 10, // Add margin to align with TextInput label
  },
  // Styles for Inline Creditor Selection
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 0, // Adjust padding as needed
  },
  backButton: {
    // Removed fixed width, let it size naturally
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 10, // Add padding to the right of the icon/text
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1, // Allow title to take remaining space
  },
  searchbar: {
    // backgroundColor set dynamically
    borderRadius: 8,
    marginBottom: 12,
  },
  searchInput: {
    fontSize: 14,
    // color set dynamically
  },
  list: {
    // No specific style needed, maybe max height if performance is an issue
    // maxHeight: height * 0.4, 
  },
  loadingContainer: {
    paddingVertical: 40, // More padding when loading
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    // color set dynamically
  },
  itemTitle: {
    fontSize: 15,
    // color set dynamically
  },
  itemDescription: {
    fontSize: 12,
    // color set dynamically
  },
  clearItem: {
    // color set dynamically
    fontStyle: 'italic',
    fontWeight: '500',
  },
  divider: {
    // backgroundColor set dynamically
  },
});
