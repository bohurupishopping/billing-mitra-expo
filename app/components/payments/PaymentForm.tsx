import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Platform, ScrollView, Dimensions, LayoutAnimation, UIManager, FlatList } from 'react-native';
import { Text, TextInput, Button, HelperText, Checkbox, ActivityIndicator, Surface, Searchbar, List, Divider } from 'react-native-paper'; // Added Searchbar, List, Divider
import { router } from 'expo-router'; // Keep router if needed for other navigation, but not for back
import { useBusiness } from '@/contexts/BusinessContext';
import { IndianRupee, CreditCard, User, FileText, Calendar, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react-native'; // Added ArrowLeft
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import { Payment, Creditor, BankAccount, Bill, createPayment, updateCreditorOutstandingAmount, updateBillStatus, createBankTransaction, fetchCreditors, fetchBankAccounts, fetchBillsForCreditor, generatePaymentNumber } from '../../../lib/api/payments';
// Removed SearchableSelectModal import

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const isTablet = width > 768;

// Interface definitions remain the same...
interface FormData {
  paymentNumber: string;
  paymentDate: string;
  amount: string;
  creditorId: string;
  bankAccountId: string;
  billId: string;
  reference: string;
  notes: string;
  createBankTransaction: boolean;
}

interface FormErrors {
  paymentNumber?: string;
  paymentDate?: string;
  amount?: string;
  bankAccountId?: string;
  submit?: string;
}

interface PaymentFormProps {
  onSuccess?: () => void;
  // Add onCancel prop to be called by the Cancel button
  onCancel?: () => void; 
}

// Enum for selection view state
enum SelectionView {
  None,
  Creditor,
  BankAccount,
  Bill
}

export default function PaymentForm({ onSuccess, onCancel }: PaymentFormProps) {
  const { selectedBusiness } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    paymentNumber: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    creditorId: '',
    bankAccountId: '',
    billId: '',
    reference: '',
    notes: '',
    createBankTransaction: true
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [fetchingCreditors, setFetchingCreditors] = useState(true);
  const [fetchingAccounts, setFetchingAccounts] = useState(true);
  const [fetchingBills, setFetchingBills] = useState(true);
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  
  // State for inline selection views
  const [currentSelectionView, setCurrentSelectionView] = useState<SelectionView>(SelectionView.None);
  const [creditorSearchQuery, setCreditorSearchQuery] = useState('');
  const [bankAccountSearchQuery, setBankAccountSearchQuery] = useState('');
  const [billSearchQuery, setBillSearchQuery] = useState('');

  // --- Data Loading (remains mostly the same) ---
  useEffect(() => {
    if (selectedBusiness) {
      loadInitialData();
    }
  }, [selectedBusiness]);

  useEffect(() => {
    if (selectedBusiness && formData.creditorId) {
      loadBillsForCreditor();
    } else {
      setBills([]);
      // Reset bill selection if creditor is cleared
      if (!formData.creditorId) {
          setFormData(prev => ({ ...prev, billId: '' }));
      }
    }
  }, [selectedBusiness, formData.creditorId]);

  const loadInitialData = async () => {
    if (!selectedBusiness) return;
    setFetchingCreditors(true);
    setFetchingAccounts(true);
    try {
      const [creditorsData, bankAccountsData, paymentNumber] = await Promise.all([
        fetchCreditors(selectedBusiness.id),
        fetchBankAccounts(selectedBusiness.id),
        generatePaymentNumber(selectedBusiness.id)
      ]);
      setCreditors(creditorsData);
      setBankAccounts(bankAccountsData);
      setFormData(prev => ({ ...prev, paymentNumber }));
    } catch (err: any) {
      console.error('Error loading initial data:', err);
      setErrors(prev => ({ ...prev, submit: 'Failed to load initial data' })); // Provide feedback
    } finally {
      setFetchingCreditors(false);
      setFetchingAccounts(false);
    }
  };

  const loadBillsForCreditor = async () => {
    if (!selectedBusiness || !formData.creditorId) return;
    setFetchingBills(true);
    try {
      const billsData = await fetchBillsForCreditor(selectedBusiness.id, formData.creditorId);
      setBills(billsData);
    } catch (err: any) {
      console.error('Error loading bills:', err);
      setErrors(prev => ({ ...prev, submit: 'Failed to load bills for creditor' })); // Provide feedback
    } finally {
      setFetchingBills(false);
    }
  };

  // --- Validation and Handlers (remains mostly the same) ---
  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!formData.paymentNumber.trim()) newErrors.paymentNumber = 'Payment number is required';
    if (!formData.amount.trim()) newErrors.amount = 'Amount is required';
    else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) newErrors.amount = 'Amount must be a positive number';
    }
    if (!formData.paymentDate.trim()) newErrors.paymentDate = 'Payment date is required';
    if (formData.createBankTransaction && !formData.bankAccountId) {
      newErrors.bankAccountId = 'Please select a bank account or uncheck "Create bank transaction"';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleToggleAdditionalFields = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAdditionalFields(!showAdditionalFields);
  };

  const handleCreateBankTransactionToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFormData(prev => ({ ...prev, createBankTransaction: !prev.createBankTransaction }));
  };

  // --- Inline Selection Logic ---
  const getDisplayValue = (item: any, key: string | ((item: any) => string) | undefined): string | undefined => {
      if (!key) return undefined;
      if (typeof key === 'function') return key(item);
      // Ensure the key exists and the value is converted to string safely
      return item && item.hasOwnProperty(key) ? String(item[key]) : undefined;
  };

  // Creditor Selection
  const filteredCreditors = useMemo(() => {
    if (!creditorSearchQuery) return creditors;
    const lowerCaseQuery = creditorSearchQuery.toLowerCase();
    return creditors.filter(item => 
        item.name?.toLowerCase().includes(lowerCaseQuery) || 
        item.email?.toLowerCase().includes(lowerCaseQuery) ||
        item.phone?.toLowerCase().includes(lowerCaseQuery)
    );
  }, [creditors, creditorSearchQuery]);

  const handleCreditorSelect = (creditor: Creditor | null) => {
    setFormData(prev => ({ ...prev, creditorId: creditor?.id || '', billId: '' })); // Reset bill too
    setCreditorSearchQuery('');
    setCurrentSelectionView(SelectionView.None);
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

  // Bank Account Selection
  const filteredBankAccounts = useMemo(() => {
    if (!bankAccountSearchQuery) return bankAccounts;
    const lowerCaseQuery = bankAccountSearchQuery.toLowerCase();
    return bankAccounts.filter(item => 
        item.name?.toLowerCase().includes(lowerCaseQuery) ||
        item.account_number?.toLowerCase().includes(lowerCaseQuery)
    );
  }, [bankAccounts, bankAccountSearchQuery]);

  const handleBankAccountSelect = (account: BankAccount | null) => {
    setFormData(prev => ({ ...prev, bankAccountId: account?.id || '' }));
    setBankAccountSearchQuery('');
    setCurrentSelectionView(SelectionView.None);
  };

  const renderBankAccountItem = ({ item }: { item: BankAccount }) => (
    <List.Item
      title={getDisplayValue(item, 'name')}
      description={`${item.account_type} - Bal: ₹${item.current_balance?.toLocaleString() ?? '0'}`}
      onPress={() => handleBankAccountSelect(item)}
      titleStyle={styles.itemTitle}
      descriptionStyle={styles.itemDescription}
    />
  );

  // Bill Selection
  const filteredBills = useMemo(() => {
    if (!billSearchQuery) return bills;
    const lowerCaseQuery = billSearchQuery.toLowerCase();
    return bills.filter(item => item.bill_number?.toLowerCase().includes(lowerCaseQuery));
  }, [bills, billSearchQuery]);

  const handleBillSelect = (bill: Bill | null) => {
    setFormData(prev => ({
      ...prev,
      billId: bill?.id || '',
      // Only auto-fill amount if it's currently empty
      amount: bill && !prev.amount ? bill.total_amount.toString() : prev.amount,
    }));
    setBillSearchQuery('');
    setCurrentSelectionView(SelectionView.None);
  };

  const renderBillItem = ({ item }: { item: Bill }) => (
    <List.Item
      title={getDisplayValue(item, 'bill_number')}
      description={`Amt: ₹${item.total_amount?.toLocaleString() ?? '0'} | Due: ${format(new Date(item.due_date), 'MMM dd, yyyy')}`}
      onPress={() => handleBillSelect(item)}
      titleStyle={styles.itemTitle}
      descriptionStyle={styles.itemDescription}
    />
  );

  // --- Submit Handler ---
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrors({});
      if (!validateForm() || !selectedBusiness) {
          setLoading(false); 
          return;
      }
      
      const amount = parseFloat(formData.amount); // Validation ensures this is a positive number
      const paymentData = { // No need for Partial if we provide all required fields
        business_id: selectedBusiness.id,
        payment_number: formData.paymentNumber,
        amount: amount as number, // Assert as number after validation
        payment_date: formData.paymentDate,
        creditor_id: formData.creditorId || null,
        bank_account_id: formData.createBankTransaction ? formData.bankAccountId : null,
        payment_method: formData.createBankTransaction ? 'Bank Transfer' : 'Other',
        reference: formData.reference || null,
        notes: formData.notes || null
      };

      const payment = await createPayment(paymentData);

      // Update creditor outstanding amount
      if (formData.creditorId) {
        const creditor = creditors.find(c => c.id === formData.creditorId);
        if (creditor) {
          const currentOutstanding = Number(creditor.outstanding_amount || 0);
          const newOutstandingAmount = Math.max(0, currentOutstanding - amount);
          await updateCreditorOutstandingAmount(formData.creditorId, newOutstandingAmount);
        }
      }

      // Update bill status if applicable
      if (formData.billId) {
        const bill = bills.find(b => b.id === formData.billId);
        // Consider partial payments later, for now mark paid if payment >= bill amount
        if (bill && amount >= Number(bill.total_amount)) { 
          await updateBillStatus(formData.billId, 'PAID');
        }
      }

      // Create bank transaction if checked
      if (formData.createBankTransaction && formData.bankAccountId) {
        const transactionNumber = `WIT-${formData.paymentNumber.replace('PAY-', '')}`;
        let description = `Payment made`;
        if (formData.creditorId) {
          const creditor = creditors.find(c => c.id === formData.creditorId);
          if (creditor) description = `Payment to ${creditor.name}`;
        }
        if (formData.billId) {
          description += ` for bill ${bills.find(b => b.id === formData.billId)?.bill_number || ''}`;
        }
        
        await createBankTransaction({
          business_id: selectedBusiness.id,
          account_id: formData.bankAccountId,
          transaction_number: transactionNumber,
          type: 'withdrawal',
          amount: amount,
          date: formData.paymentDate,
          description: description.trim(),
          category: 'Payment',
          reference_id: payment.id, // Link to the created payment
          reconciled: false,
          notes: formData.notes || null
        });
      }

      onSuccess?.(); // Call parent's success handler (which should dismiss the modal)
      
    } catch (error: any) {
      console.error('Error creating payment:', error);
      setErrors(prev => ({ ...prev, submit: error.message || 'Failed to create payment' }));
    } finally {
      setLoading(false);
    }
  };

  // --- Render Logic ---
  if (!selectedBusiness) {
    return ( 
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Please select a business to continue</Text>
      </View>
     );
  }

  // Helper to render selection list
  const renderSelectionList = (
      title: string, 
      data: any[], 
      renderItemFunc: ({ item }: { item: any }) => JSX.Element, 
      searchQuery: string, 
      setSearchQueryFunc: (query: string) => void,
      handleSelectFunc: (item: any | null) => void,
      fetching: boolean,
      allowClear: boolean,
      clearLabel: string
  ) => (
      <View>
          <View style={styles.selectionHeader}>
              <Button 
                  icon={() => <ArrowLeft size={20} color="#4f46e5" />} 
                  onPress={() => setCurrentSelectionView(SelectionView.None)}
                  compact mode="text" style={styles.backButton} labelStyle={{ color: "#4f46e5" }}
              >
                  Back
              </Button>
              <Text style={styles.selectionTitle}>{title}</Text>
              <View style={{ width: 60 }} /> 
          </View>
          <Searchbar
              placeholder={`Search ${title}...`}
              onChangeText={setSearchQueryFunc}
              value={searchQuery}
              style={styles.searchbar}
              inputStyle={styles.searchInput}
              elevation={0}
          />
          {fetching ? (
              <View style={styles.loadingContainer}><ActivityIndicator animating={true} size="large" /></View>
          ) : (
              <FlatList // Use FlatList directly
                  data={data}
                  renderItem={renderItemFunc}
                  keyExtractor={(item) => item.id.toString()}
                  ItemSeparatorComponent={() => <Divider style={styles.divider} />}
                  ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No items found.</Text></View>}
                  ListHeaderComponent={allowClear ? (
                      <>
                          <List.Item title={clearLabel} onPress={() => handleSelectFunc(null)} titleStyle={[styles.itemTitle, styles.clearItem]} />
                          <Divider style={styles.divider} />
                      </>
                  ) : null}
                  style={styles.list}
                  // Prevent FlatList from scrolling independently within ScrollView
                  // This is crucial for inline display.
                  scrollEnabled={false} 
              />
          )}
      </View>
  );

  return (
    // Removed outer container View, parent modal provides it
    <> 
      {/* Stats Container */}
      <Surface style={styles.statsContainer}>
         <View style={styles.statItem}>
           <View style={[styles.statIcon, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
             <CreditCard size={16} color="#4f46e5" strokeWidth={2.5} />
           </View>
           <View style={styles.statInfo}>
             <Text style={styles.statLabel}>Payment Number</Text>
             <Text style={styles.statValue}>{formData.paymentNumber || '...'}</Text> 
           </View>
         </View>
         <View style={styles.statDivider} />
         <View style={styles.statItem}>
           <View style={[styles.statIcon, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
             <IndianRupee size={16} color="#4f46e5" strokeWidth={2.5} />
           </View>
           <View style={styles.statInfo}>
             <Text style={styles.statLabel}>Amount</Text>
             <Text style={styles.statValue}>₹{formData.amount || '0.00'}</Text>
           </View>
         </View>
         <View style={styles.statDivider} />
         <View style={styles.statItem}>
           <View style={[styles.statIcon, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
             <Calendar size={16} color="#4f46e5" strokeWidth={2.5} />
           </View>
           <View style={styles.statInfo}>
             <Text style={styles.statLabel}>Payment Date</Text>
             <Text style={styles.statValue}>
               {format(new Date(formData.paymentDate), 'MMM dd, yyyy')}
             </Text>
           </View>
         </View>
      </Surface>

      {/* Main Content Area: Form or Selection List */}
      {/* Wrap in a View to manage layout, padding is handled by parent ScrollView */}
      <View style={[styles.formContentContainer]}> 
          {currentSelectionView === SelectionView.None ? (
              // --- Render Main Form ---
              <View style={[styles.formGrid, isTablet && styles.formGridTablet]}>
                  {/* Left Column */}
                  <View style={[styles.formColumn, isTablet && styles.formColumnTablet]}>
                      <Animated.View entering={FadeInDown.duration(300).delay(100)}>
                          <TextInput mode="outlined" label="Payment Number" value={formData.paymentNumber} onChangeText={(text) => setFormData(prev => ({ ...prev, paymentNumber: text }))} error={!!errors.paymentNumber} style={styles.input} />
                          {errors.paymentNumber && <HelperText type="error">{errors.paymentNumber}</HelperText>}
                      </Animated.View>
                      <Animated.View entering={FadeInDown.duration(300).delay(200)}>
                          <TextInput mode="outlined" label="Payment Date" value={formData.paymentDate} onChangeText={(text) => setFormData(prev => ({ ...prev, paymentDate: text }))} error={!!errors.paymentDate} style={styles.input} />
                          {errors.paymentDate && <HelperText type="error">{errors.paymentDate}</HelperText>}
                      </Animated.View>
                      <Animated.View entering={FadeInDown.duration(300).delay(300)}>
                          <TextInput mode="outlined" label="Amount" value={formData.amount} onChangeText={(text) => setFormData(prev => ({ ...prev, amount: text }))} error={!!errors.amount} keyboardType="numeric" left={<TextInput.Icon icon={() => <IndianRupee size={20} color="#64748b" />} />} style={styles.input} />
                          {errors.amount && <HelperText type="error">{errors.amount}</HelperText>}
                      </Animated.View>
                      <Animated.View entering={FadeInDown.duration(300).delay(400)}>
                          <Button mode="outlined" onPress={() => setCurrentSelectionView(SelectionView.Creditor)} style={styles.selectButton} contentStyle={styles.selectButtonContent} labelStyle={styles.selectButtonLabel} disabled={fetchingCreditors} icon={() => <User size={18} color="#64748b" />}>
                              {creditors.find(c => c.id === formData.creditorId)?.name || 'Select Creditor (Optional)'}
                          </Button>
                      </Animated.View>
                      {formData.creditorId && bills.length > 0 && (
                          <Animated.View entering={FadeInDown.duration(300).delay(450)}>
                              <Button mode="outlined" onPress={() => setCurrentSelectionView(SelectionView.Bill)} style={styles.selectButton} contentStyle={styles.selectButtonContent} labelStyle={styles.selectButtonLabel} disabled={fetchingBills} icon={() => <FileText size={18} color="#64748b" />}>
                                  {bills.find(b => b.id === formData.billId)?.bill_number || 'Select Bill (Optional)'}
                              </Button>
                          </Animated.View>
                      )}
                  </View>
                  {/* Right Column */}
                  <View style={[styles.formColumn, isTablet && styles.formColumnTablet]}>
                      <Animated.View entering={FadeInDown.duration(300).delay(500)}>
                          <TextInput mode="outlined" label="Payment Method" value={formData.createBankTransaction ? 'Bank Transfer' : 'Other'} disabled style={styles.input} />
                      </Animated.View>
                      <Animated.View entering={FadeInDown.duration(300).delay(550)}>
                          <View style={styles.checkboxContainer}>
                              <Checkbox status={formData.createBankTransaction ? 'checked' : 'unchecked'} onPress={handleCreateBankTransactionToggle} />
                              <Text style={styles.checkboxLabel} onPress={handleCreateBankTransactionToggle}>Create bank transaction record</Text>
                          </View>
                      </Animated.View>
                      {formData.createBankTransaction && (
                          <Animated.View entering={FadeInDown.duration(300).delay(600)}>
                              <Button mode="outlined" onPress={() => setCurrentSelectionView(SelectionView.BankAccount)} style={[styles.selectButton, !!errors.bankAccountId && styles.errorBorder]} contentStyle={styles.selectButtonContent} labelStyle={styles.selectButtonLabel} disabled={fetchingAccounts} icon={() => <CreditCard size={18} color="#64748b" />}>
                                  {bankAccounts.find(acc => acc.id === formData.bankAccountId)?.name || 'Select Bank Account'}
                              </Button>
                              {errors.bankAccountId && <HelperText type="error">{errors.bankAccountId}</HelperText>}
                          </Animated.View>
                      )}
                      <Button mode="text" onPress={handleToggleAdditionalFields} icon={() => showAdditionalFields ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />} style={styles.toggleButton}>
                          {showAdditionalFields ? 'Hide Additional Fields' : 'Show Additional Fields'}
                      </Button>
                      {showAdditionalFields && (
                          <>
                              <Animated.View entering={FadeInDown.duration(300).delay(700)}>
                                  <TextInput mode="outlined" label="Reference (Optional)" value={formData.reference} onChangeText={(text) => setFormData(prev => ({ ...prev, reference: text }))} style={styles.input} />
                              </Animated.View>
                              <Animated.View entering={FadeInDown.duration(300).delay(800)}>
                                  <TextInput mode="outlined" label="Notes (Optional)" value={formData.notes} onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))} multiline numberOfLines={4} style={styles.input} />
                              </Animated.View>
                          </>
                      )}
                  </View>
              </View>
          ) : currentSelectionView === SelectionView.Creditor ? (
              renderSelectionList('Select Creditor', filteredCreditors, renderCreditorItem, creditorSearchQuery, setCreditorSearchQuery, handleCreditorSelect, fetchingCreditors, true, 'No Creditor')
          ) : currentSelectionView === SelectionView.BankAccount ? (
              renderSelectionList('Select Bank Account', filteredBankAccounts, renderBankAccountItem, bankAccountSearchQuery, setBankAccountSearchQuery, handleBankAccountSelect, fetchingAccounts, false, '')
          ) : currentSelectionView === SelectionView.Bill ? (
              renderSelectionList('Select Bill', filteredBills, renderBillItem, billSearchQuery, setBillSearchQuery, handleBillSelect, fetchingBills, true, 'No Specific Bill')
          ) : null}

          {/* Submit Error (Show only in main form view) */}
          {currentSelectionView === SelectionView.None && errors.submit && (
              <Text style={styles.errorText}>{errors.submit}</Text>
          )}

          {/* Actions (Show only in main form view) */}
          {currentSelectionView === SelectionView.None && (
              <View style={styles.actions}>
                  {/* Use onCancel prop for Cancel button */}
                  <Button mode="outlined" onPress={onCancel} style={styles.button}>Cancel</Button> 
                  <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading} style={styles.button}>Create Payment</Button>
              </View>
          )}
      </View>
      {/* Removed the separate SearchableSelectModal components */}
    </>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff', // Use theme color later
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16, // Match form padding
    marginTop: 0, // Align with top padding of form container
    marginBottom: 16, // Space before form
    elevation: 2,
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  statInfo: { gap: 2 },
  statLabel: { fontSize: 12, color: '#64748b', opacity: 0.8 },
  statValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  statDivider: { width: 1, height: 24, backgroundColor: '#e2e8f0', marginHorizontal: 8 },
  formContentContainer: { // Renamed from form, parent ScrollView handles padding
     // Removed padding: 16
  },
  formTablet: { /* Keep for potential future use */ },
  formGrid: { gap: 16 },
  formGridTablet: { flexDirection: 'row', gap: 24 },
  formColumn: { gap: 16 },
  formColumnTablet: { flex: 1 },
  input: { backgroundColor: '#ffffff' }, // Use theme color later
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkboxLabel: { marginLeft: 8, fontSize: 14, color: '#334155' },
  toggleButton: { marginVertical: 8, alignSelf: 'flex-start' },
  errorText: { color: '#ef4444', marginBottom: 16, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  button: { minWidth: 120 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  emptyText: { fontSize: 16, color: '#64748b', textAlign: 'center' },
  selectButton: { backgroundColor: '#ffffff', borderColor: '#cbd5e1', height: 56, justifyContent: 'center', borderRadius: 4 }, // Added border radius
  selectButtonContent: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, height: '100%' },
  selectButtonLabel: { fontSize: 16, color: '#1e293b', textAlign: 'left', flex: 1 },
  errorBorder: { borderColor: '#ef4444' },
  // Styles for Inline Selection View
  selectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 0 },
  backButton: { justifyContent: 'center', alignItems: 'center', paddingRight: 10 },
  selectionTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', flex: 1 },
  searchbar: { backgroundColor: '#f1f5f9', borderRadius: 8, marginBottom: 12 }, // Use theme color later
  searchInput: { fontSize: 14 },
  list: { /* No specific style needed */ }, 
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  itemTitle: { fontSize: 15, color: '#1e293b' }, // Use theme color later
  itemDescription: { fontSize: 12, color: '#64748b' }, // Use theme color later
  clearItem: { color: '#4f46e5', fontStyle: 'italic', fontWeight: '500' },
  divider: { backgroundColor: '#e2e8f0' }, // Use theme color later
  emptyContainer: { // Added missing style
    padding: 20,
    alignItems: 'center',
  },
});
