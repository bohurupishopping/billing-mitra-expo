import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, Pressable, LayoutAnimation, UIManager } from 'react-native';
import { Text, TextInput, Button, HelperText, Checkbox, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { IndianRupee, CreditCard, User, FileText, Calendar, ChevronDown, ChevronUp, ArrowLeft, Save } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { Payment, Creditor, BankAccount, Bill, fetchCreditors, fetchBankAccounts, fetchBillsForCreditor } from '../../../../lib/api/payments'; // Corrected path again
import { supabase } from '@/lib/supabase';
import SearchableSelectModal from '../../../components/ui/SearchableSelectModal'; // Corrected path
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const isTablet = width > 768;

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

export default function EditPaymentScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { selectedBusiness } = useBusiness();
  const insets = useSafeAreaInsets(); // Get safe area insets
  
  const [formData, setFormData] = useState<FormData>({
    paymentNumber: '',
    paymentDate: '',
    amount: '',
    creditorId: '',
    bankAccountId: '',
    billId: '',
    reference: '',
    notes: '',
    createBankTransaction: false
  });
  
  const [originalData, setOriginalData] = useState<Payment | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [fetchingCreditors, setFetchingCreditors] = useState(true);
  const [fetchingAccounts, setFetchingAccounts] = useState(true);
  const [fetchingBills, setFetchingBills] = useState(true);
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  const [isBankAccountModalVisible, setIsBankAccountModalVisible] = useState(false);
  const [isCreditorModalVisible, setIsCreditorModalVisible] = useState(false);
  const [isBillModalVisible, setIsBillModalVisible] = useState(false);

  useEffect(() => {
    if (selectedBusiness && id) {
      fetchPayment();
      fetchCreditors();
      fetchBankAccounts();
    }
  }, [selectedBusiness, id]);

  useEffect(() => {
    if (selectedBusiness && formData.creditorId) {
      loadBillsForCreditor();
    } else {
      setBills([]);
    }
  }, [selectedBusiness, formData.creditorId]);

  const fetchPayment = async () => {
    if (!selectedBusiness || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setOriginalData(data);
        setFormData({
          paymentNumber: data.payment_number,
          amount: data.amount.toString(),
          paymentDate: new Date(data.payment_date).toISOString().split('T')[0],
          creditorId: data.creditor_id || '',
          bankAccountId: data.bank_account_id || '',
          billId: '',
          reference: data.reference || '',
          notes: data.notes || '',
          createBankTransaction: data.payment_method === 'Bank Transfer'
        });
      } else {
        router.back();
      }
    } catch (err) {
      console.error('Error fetching payment:', err);
      setErrors(prev => ({ ...prev, submit: 'Failed to load payment' }));
      router.back();
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchCreditors = async () => {
    if (!selectedBusiness) return;
    
    setFetchingCreditors(true);
    try {
      const { data, error } = await supabase
        .from('creditors')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('name');
        
      if (error) throw error;
      setCreditors(data || []);
    } catch (err) {
      console.error('Error fetching creditors:', err);
    } finally {
      setFetchingCreditors(false);
    }
  };

  const fetchBankAccounts = async () => {
    if (!selectedBusiness) return;
    
    setFetchingAccounts(true);
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('name');
        
      if (error) throw error;
      setBankAccounts(data || []);
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
    } finally {
      setFetchingAccounts(false);
    }
  };

  const loadBillsForCreditor = async () => {
    if (!selectedBusiness || !formData.creditorId) return;
    
    setFetchingBills(true);
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .eq('creditor_id', formData.creditorId)
        .eq('status', 'PENDING')
        .order('issue_date', { ascending: false });
        
      if (error) throw error;
      setBills(data || []);
    } catch (err) {
      console.error('Error loading bills:', err);
    } finally {
      setFetchingBills(false);
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    if (!formData.paymentNumber.trim()) {
      newErrors.paymentNumber = 'Payment number is required';
    }
    
    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      }
    }
    
    if (!formData.paymentDate.trim()) {
      newErrors.paymentDate = 'Payment date is required';
    }
    
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

  const handleSelectBill = (bill: Bill | null) => {
    setFormData(prev => ({
      ...prev,
      billId: bill?.id || '',
      // Don't auto-fill amount on edit screen unless explicitly needed
    }));
    setIsBillModalVisible(false);
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedBusiness || !id || !originalData) return;
    
    setLoading(true);
    
    try {
      const amount = parseFloat(formData.amount);
      const oldAmount = Number(originalData.amount);
      const amountDifference = amount - oldAmount;
      
      const { error } = await supabase
        .from('payments')
        .update({
          payment_number: formData.paymentNumber,
          amount: amount,
          payment_date: formData.paymentDate,
          creditor_id: formData.creditorId || null,
          bank_account_id: formData.createBankTransaction ? formData.bankAccountId : null,
          payment_method: formData.createBankTransaction ? 'Bank Transfer' : 'Other',
          reference: formData.reference || null,
          notes: formData.notes || null
        })
        .eq('id', id)
        .eq('business_id', selectedBusiness.id);
        
      if (error) throw error;
      
      const oldCreditorId = originalData.creditor_id;
      const newCreditorId = formData.creditorId;
      
      if (oldCreditorId !== newCreditorId) {
        if (oldCreditorId) {
          const { data: oldCreditor } = await supabase
            .from('creditors')
            .select('outstanding_amount')
            .eq('id', oldCreditorId)
            .single();
            
          if (oldCreditor) {
            const newOutstandingAmount = Number(oldCreditor.outstanding_amount) + oldAmount;
            
            await supabase
              .from('creditors')
              .update({ outstanding_amount: newOutstandingAmount })
              .eq('id', oldCreditorId);
          }
        }
        
        if (newCreditorId) {
          const { data: newCreditor } = await supabase
            .from('creditors')
            .select('outstanding_amount')
            .eq('id', newCreditorId)
            .single();
            
          if (newCreditor) {
            const newOutstandingAmount = Math.max(0, Number(newCreditor.outstanding_amount) - amount);
            
            await supabase
              .from('creditors')
              .update({ outstanding_amount: newOutstandingAmount })
              .eq('id', newCreditorId);
          }
        }
      } else if (oldCreditorId && amountDifference !== 0) {
        const { data: creditor } = await supabase
          .from('creditors')
          .select('outstanding_amount')
          .eq('id', oldCreditorId)
          .single();
          
        if (creditor) {
          const newOutstandingAmount = Math.max(0, Number(creditor.outstanding_amount) - amountDifference);
          
          await supabase
            .from('creditors')
            .update({ outstanding_amount: newOutstandingAmount })
            .eq('id', oldCreditorId);
        }
      }
      
      if (formData.createBankTransaction) {
        const { data: transaction } = await supabase
          .from('transactions')
          .select('id')
          .eq('reference_id', id)
          .eq('type', 'withdrawal')
          .single();
          
        let description = `Payment made`;
        if (formData.creditorId) {
          const creditor = creditors.find(c => c.id === formData.creditorId);
          if (creditor) {
            description = `Payment to ${creditor.name}`;
          }
        }
        
        if (transaction) {
          await supabase
            .from('transactions')
            .update({
              account_id: formData.bankAccountId,
              amount: amount,
              date: formData.paymentDate,
              description: description,
              notes: formData.notes || null
            })
            .eq('id', transaction.id);
        } else {
          const transactionNumber = `WIT-${formData.paymentNumber.replace('PAY-', '')}`;
          
          await supabase
            .from('transactions')
            .insert({
              business_id: selectedBusiness.id,
              account_id: formData.bankAccountId,
              transaction_number: transactionNumber,
              type: 'withdrawal',
              amount: amount,
              date: formData.paymentDate,
              description: description,
              category: 'Payment',
              reference_id: id,
              reconciled: false,
              notes: formData.notes || null
            });
        }
      } else {
        await supabase
          .from('transactions')
          .delete()
          .eq('reference_id', id)
          .eq('type', 'withdrawal');
      }
      
      router.back();
    } catch (err) {
      console.error('Error updating payment:', err);
      setErrors(prev => ({ ...prev, submit: 'Failed to update payment' }));
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <View style={styles.container}>
        {/* Optional: Add a proper loading skeleton here */}
        <View style={styles.centered}>
          <ActivityIndicator animating={true} size="large" />
          <Text>Loading payment details...</Text>
        </View>
      </View>
    );
  }

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
            hitSlop={10}
            aria-label="Go back"
          >
            <ArrowLeft size={24} color="#ffffff" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Edit Payment</Text>
            <Text style={styles.headerSubtitle}>
              Update payment information
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <CreditCard size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Payment Number</Text>
              <Text style={styles.statValue}>{formData.paymentNumber}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <IndianRupee size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Amount</Text>
              <Text style={styles.statValue}>₹{formData.amount}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Calendar size={16} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Payment Date</Text>
              <Text style={styles.statValue}>
                {format(new Date(formData.paymentDate), 'MMM dd, yyyy')}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.form, isTablet && styles.formTablet]} entering={FadeInUp.duration(400).delay(100)}>
          <View style={[styles.formGrid, isTablet && styles.formGridTablet]}>
            {/* Left Column */}
            <View style={[styles.formColumn, isTablet && styles.formColumnTablet]}>
              <Animated.View entering={FadeInDown.duration(300).delay(100)}>
                <TextInput
                  mode="outlined"
                  label="Payment Number"
                  value={formData.paymentNumber}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, paymentNumber: text }))}
                  error={!!errors.paymentNumber}
                  style={styles.input}
                />
                {errors.paymentNumber && (
                  <HelperText type="error">{errors.paymentNumber}</HelperText>
                )}
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(300).delay(200)}>
                <TextInput
                  mode="outlined"
                  label="Payment Date"
                  value={formData.paymentDate}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, paymentDate: text }))}
                  error={!!errors.paymentDate}
                  style={styles.input}
                />
                {errors.paymentDate && (
                  <HelperText type="error">{errors.paymentDate}</HelperText>
                )}
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(300).delay(300)}>
                <TextInput
                  mode="outlined"
                  label="Amount"
                  value={formData.amount}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, amount: text }))}
                  error={!!errors.amount}
                  keyboardType="numeric"
                  left={<TextInput.Icon icon={() => <IndianRupee size={20} color="#64748b" />} />}
                  style={styles.input}
                />
                {errors.amount && (
                  <HelperText type="error">{errors.amount}</HelperText>
                )}
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(300).delay(400)}>
                <Button
                  mode="outlined"
                  onPress={() => setIsCreditorModalVisible(true)}
                  style={styles.selectButton}
                  contentStyle={styles.selectButtonContent}
                  labelStyle={styles.selectButtonLabel}
                  disabled={fetchingCreditors}
                  icon={() => <User size={18} color="#64748b" />}
                >
                  {creditors.find(c => c.id === formData.creditorId)?.name || 'Select Creditor (Optional)'}
                </Button>
              </Animated.View>

              {formData.creditorId && bills.length > 0 && (
                <Animated.View entering={FadeInDown.duration(300).delay(450)}>
                  <Button
                    mode="outlined"
                    onPress={() => setIsBillModalVisible(true)}
                    style={styles.selectButton}
                    contentStyle={styles.selectButtonContent}
                    labelStyle={styles.selectButtonLabel}
                    disabled={fetchingBills}
                    icon={() => <FileText size={18} color="#64748b" />}
                  >
                    {bills.find(b => b.id === formData.billId)?.bill_number || 'Select Bill (Optional)'}
                  </Button>
                </Animated.View>
              )}
            </View>

            {/* Right Column */}
            <View style={[styles.formColumn, isTablet && styles.formColumnTablet]}>
              <Animated.View entering={FadeInDown.duration(300).delay(500)}>
                <TextInput
                  mode="outlined"
                  label="Payment Method"
                  value={formData.createBankTransaction ? 'Bank Transfer' : 'Other'}
                  disabled
                  style={styles.input}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(300).delay(550)}>
                <View style={styles.checkboxContainer}>
                  <Checkbox
                    status={formData.createBankTransaction ? 'checked' : 'unchecked'}
                    onPress={handleCreateBankTransactionToggle} // Use handler for animation
                  />
                  <Text style={styles.checkboxLabel} onPress={handleCreateBankTransactionToggle}>
                    Create/Update bank transaction record
                  </Text>
                </View>
              </Animated.View>

              {formData.createBankTransaction && (
                <Animated.View entering={FadeInDown.duration(300).delay(600)}>
                  <Button
                    mode="outlined"
                    onPress={() => setIsBankAccountModalVisible(true)}
                    style={[styles.selectButton, !!errors.bankAccountId && styles.errorBorder]} // Add error border
                    contentStyle={styles.selectButtonContent}
                    labelStyle={styles.selectButtonLabel}
                    disabled={fetchingAccounts}
                    icon={() => <CreditCard size={18} color="#64748b" />}
                  >
                    {bankAccounts.find(acc => acc.id === formData.bankAccountId)?.name || 'Select Bank Account'}
                  </Button>
                  {errors.bankAccountId && (
                    <HelperText type="error">{errors.bankAccountId}</HelperText>
                  )}
                </Animated.View>
              )}

              <Button
                mode="text"
                onPress={handleToggleAdditionalFields} // Use handler for animation
                icon={() => showAdditionalFields ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
                style={styles.toggleButton}
              >
                {showAdditionalFields ? 'Hide Additional Fields' : 'Show Additional Fields'}
              </Button>

              {showAdditionalFields && (
                <React.Fragment>
                  <Animated.View entering={FadeInDown.duration(300).delay(700)}>
                    <TextInput
                      mode="outlined"
                      label="Reference (Optional)"
                      value={formData.reference}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, reference: text }))}
                      style={styles.input}
                    />
                  </Animated.View>

                  <Animated.View entering={FadeInDown.duration(300).delay(800)}>
                    <TextInput
                      mode="outlined"
                      label="Notes (Optional)"
                      value={formData.notes}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                      multiline
                      numberOfLines={4}
                      style={styles.input}
                    />
                  </Animated.View>
                </React.Fragment>
              )}
            </View>
          </View>

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
              Save Changes
            </Button>
          </View>
        </Animated.View> {/* End of Animated.View for form */}
      </ScrollView>

      {/* Creditor Selection Modal */}
      <SearchableSelectModal
        visible={isCreditorModalVisible}
        onDismiss={() => setIsCreditorModalVisible(false)}
        items={creditors}
        onSelect={(creditor: Creditor | null) => {
          setFormData(prev => ({ ...prev, creditorId: creditor?.id || '', billId: '' })); // Reset bill if creditor changes
          setIsCreditorModalVisible(false);
        }}
        title="Select Creditor"
        labelKey="name"
        descriptionKey={(item: Creditor) => `Outstanding: ₹${item.outstanding_amount.toLocaleString()}`}
        searchKeys={['name']}
        loading={fetchingCreditors}
        allowClear={true}
        clearLabel="No Creditor"
      />

      {/* Bank Account Selection Modal */}
      <SearchableSelectModal
        visible={isBankAccountModalVisible}
        onDismiss={() => setIsBankAccountModalVisible(false)}
        items={bankAccounts}
        onSelect={(account: BankAccount | null) => {
          setFormData(prev => ({ ...prev, bankAccountId: account?.id || '' }));
          setIsBankAccountModalVisible(false);
        }}
        title="Select Bank Account"
        labelKey="name"
        descriptionKey={(item: BankAccount) => `${item.account_type} - Balance: ₹${item.current_balance.toLocaleString()}`}
        searchKeys={['name', 'account_number']}
        loading={fetchingAccounts}
      />

      {/* Bill Selection Modal */}
      <SearchableSelectModal
        visible={isBillModalVisible}
        onDismiss={() => setIsBillModalVisible(false)}
        items={bills}
        onSelect={handleSelectBill} // Use dedicated handler
        title="Select Bill"
        labelKey="bill_number"
        descriptionKey={(item: Bill) => `Amount: ₹${item.total_amount.toLocaleString()} | Due: ${format(new Date(item.due_date), 'MMM dd, yyyy')}`}
        searchKeys={['bill_number']}
        loading={fetchingBills}
        allowClear={true}
        clearLabel="No Specific Bill"
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: { // Renamed loadingContainer for clarity
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
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
    // Removed marginBottom, handled by header paddingBottom
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
  statsContainer: {
    // Styles moved from below form to inside header gradient
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16, // Add margin top to separate from title
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
  },
  form: {
    padding: 16,
  },
  formTablet: {
    padding: 24,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  formGrid: {
    gap: 16,
  },
  formGridTablet: {
    flexDirection: 'row',
    gap: 24,
  },
  formColumn: {
    gap: 16,
  },
  formColumnTablet: {
    flex: 1,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  checkbox: {
    // Removed direct style, using container now
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#334155',
  },
  toggleButton: {
    marginVertical: 8,
    alignSelf: 'flex-start', // Align button to the left
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
  selectButton: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    height: 56,
    justifyContent: 'center',
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
  errorBorder: {
    borderColor: '#ef4444',
  },
});