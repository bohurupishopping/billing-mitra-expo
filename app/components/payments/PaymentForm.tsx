import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ScrollView, Dimensions, LayoutAnimation, UIManager } from 'react-native';
import { Text, TextInput, Button, HelperText, Checkbox, ActivityIndicator, Surface } from 'react-native-paper';
import { router } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { IndianRupee, CreditCard, User, FileText, Calendar, ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import { Payment, Creditor, BankAccount, Bill, createPayment, updateCreditorOutstandingAmount, updateBillStatus, createBankTransaction, fetchCreditors, fetchBankAccounts, fetchBillsForCreditor, generatePaymentNumber } from '../../../lib/api/payments';
import SearchableSelectModal from '../ui/SearchableSelectModal'; // Import the new modal

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

interface PaymentFormProps {
  onSuccess?: () => void;
}

export default function PaymentForm({ onSuccess }: PaymentFormProps) {
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
  const [isBankAccountModalVisible, setIsBankAccountModalVisible] = useState(false);
  const [isCreditorModalVisible, setIsCreditorModalVisible] = useState(false);
  const [isBillModalVisible, setIsBillModalVisible] = useState(false);

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
      // Optionally auto-fill amount if a bill is selected and amount is empty
      amount: bill && !prev.amount ? bill.total_amount.toString() : prev.amount,
    }));
    setIsBillModalVisible(false);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrors({});

      if (!validateForm() || !selectedBusiness) return;

      const amount = parseFloat(formData.amount);
      const payment = await createPayment({
        business_id: selectedBusiness.id,
        payment_number: formData.paymentNumber,
        amount: amount,
        payment_date: formData.paymentDate,
        creditor_id: formData.creditorId || null,
        bank_account_id: formData.createBankTransaction ? formData.bankAccountId : null,
        payment_method: formData.createBankTransaction ? 'Bank Transfer' : 'Other',
        reference: formData.reference || null,
        notes: formData.notes || null
      });

      if (formData.creditorId) {
        const creditor = creditors.find(c => c.id === formData.creditorId);
        if (creditor) {
          const newOutstandingAmount = Math.max(0, Number(creditor.outstanding_amount) - amount);
          await updateCreditorOutstandingAmount(formData.creditorId, newOutstandingAmount);
        }
      }

      if (formData.billId) {
        const bill = bills.find(b => b.id === formData.billId);
        if (bill && amount >= Number(bill.total_amount)) {
          await updateBillStatus(formData.billId, 'PAID');
        }
      }

      if (formData.createBankTransaction && formData.bankAccountId) {
        const transactionNumber = `WIT-${formData.paymentNumber.replace('PAY-', '')}`;
        let description = `Payment made`;
        if (formData.creditorId) {
          const creditor = creditors.find(c => c.id === formData.creditorId);
          if (creditor) {
            description = `Payment to ${creditor.name}`;
          }
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
          description: description,
          category: 'Payment',
          reference_id: payment.id,
          reconciled: false,
          notes: formData.notes || null
        });
      }

      onSuccess?.();
      router.back();
    } catch (error: any) {
      console.error('Error creating payment:', error);
      setErrors(prev => ({ ...prev, submit: error.message || 'Failed to create payment' }));
    } finally {
      setLoading(false);
    }
  };

  if (!selectedBusiness) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Please select a business to continue</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
            <CreditCard size={16} color="#4f46e5" strokeWidth={2.5} />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statLabel}>Payment Number</Text>
            <Text style={styles.statValue}>{formData.paymentNumber || 'Not set'}</Text>
          </View>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
            <IndianRupee size={16} color="#4f46e5" strokeWidth={2.5} />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statLabel}>Amount</Text>
            <Text style={styles.statValue}>₹{formData.amount || '0'}</Text>
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
 {/* End of Stats Container
 */}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.form, isTablet && styles.formTablet]}>
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
                    Create bank transaction record
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
            >
              Create Payment
            </Button>
          </View>
        </View>
      </ScrollView>
 {/* End of ScrollView
 */}

      {/* Creditor Selection Modal */}
      <SearchableSelectModal          visible={isCreditorModalVisible}
        onDismiss={() => setIsCreditorModalVisible(false)}
        items={creditors}
        onSelect={(creditor) => {
          setFormData(prev => ({ ...prev, creditorId: creditor?.id || '', billId: '' })); // Reset bill if creditor changes
          setIsCreditorModalVisible(false);
        }}
        title="Select Creditor"
        labelKey="name"
        descriptionKey={(item: Creditor) => `Outstanding: ₹${item.outstanding_amount.toLocaleString()}`}
        searchKeys={['name']} // Removed 'contact_person' as it might not exist directly
        loading={fetchingCreditors}
        allowClear={true}
        clearLabel="No Creditor"
      />

      {/* Bank Account Selection Modal */}
      <SearchableSelectModal
        visible={isBankAccountModalVisible}
        onDismiss={() => setIsBankAccountModalVisible(false)}
        items={bankAccounts}
        onSelect={(account) => {
          setFormData(prev => ({ ...prev, bankAccountId: account?.id || '' }));
          setIsBankAccountModalVisible(false);
        }}
        title="Select Bank Account"
        labelKey="name"
        descriptionKey={(item: BankAccount) => `${item.account_type} - Balance: ₹${item.current_balance.toLocaleString()}`}
        searchKeys={['name', 'account_number']} // Removed 'bank_name' as it might not exist directly
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
 {/* Ensured correct closing tag placement */}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    margin: 16,
    elevation: 2,
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
    color: '#64748b',
    opacity: 0.8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
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
    // backgroundColor: '#ffffff', // Optional: if you want a white background
    // paddingVertical: 4, // Optional: add some padding
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#334155', // Slightly darker text
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  selectButton: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1', // Default border color
    height: 56, // Match TextInput height
    justifyContent: 'center',
  },
  selectButtonContent: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14, // Match TextInput padding
    height: '100%',
  },
  selectButtonLabel: {
    fontSize: 16, // Match TextInput font size
    color: '#1e293b', // Match TextInput text color
    textAlign: 'left',
    flex: 1, // Ensure label takes available space
  },
  errorBorder: {
    borderColor: '#ef4444', // Error border color from react-native-paper
  },
});

