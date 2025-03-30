import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ScrollView, Dimensions } from 'react-native';
import { Text, TextInput, Button, HelperText, Checkbox, Portal, Modal, List, ActivityIndicator, Surface, Menu } from 'react-native-paper';
import { router } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { IndianRupee, CreditCard, User, FileText, Calendar, ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import { Payment, Creditor, BankAccount, Bill, createPayment, updateCreditorOutstandingAmount, updateBillStatus, createBankTransaction, fetchCreditors, fetchBankAccounts, fetchBillsForCreditor, generatePaymentNumber } from '../../lib/api/payments';

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

export function PaymentForm({ onSuccess }: PaymentFormProps) {
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
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const [showCreditorModal, setShowCreditorModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);

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

  useEffect(() => {
    if (formData.billId && bills.length > 0) {
      const selectedBill = bills.find(bill => bill.id === formData.billId);
      if (selectedBill) {
        setFormData(prev => ({
          ...prev,
          amount: selectedBill.total_amount.toString()
        }));
      }
    }
  }, [formData.billId, bills]);

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
    } catch (error) {
      console.error('Error creating payment:', error);
      setErrors(prev => ({ ...prev, submit: 'Failed to create payment' }));
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
                <Menu
                  visible={showCreditorModal}
                  onDismiss={() => setShowCreditorModal(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setShowCreditorModal(true)}
                      style={styles.input}
                      contentStyle={styles.creditorButton}
                      disabled={fetchingCreditors}
                    >
                      {creditors.find(c => c.id === formData.creditorId)?.name || 'Select Creditor (Optional)'}
                      <ChevronDown size={20} style={styles.chevron} />
                    </Button>
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      setFormData(prev => ({ ...prev, creditorId: '' }));
                      setShowCreditorModal(false);
                    }}
                    title="No Creditor"
                  />
                  {creditors.map((creditor) => (
                    <Menu.Item
                      key={creditor.id}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, creditorId: creditor.id }));
                        setShowCreditorModal(false);
                      }}
                      title={`${creditor.name} (₹${creditor.outstanding_amount.toLocaleString()})`}
                    />
                  ))}
                </Menu>
              </Animated.View>

              {formData.creditorId && bills.length > 0 && (
                <Animated.View entering={FadeInDown.duration(300).delay(450)}>
                  <TextInput
                    mode="outlined"
                    label="For Bill"
                    value={bills.find(b => b.id === formData.billId)?.bill_number || ''}
                    onPressIn={() => setShowBillModal(true)}
                    right={<TextInput.Icon icon={() => <ChevronDown size={20} color="#64748b" />} />}
                    style={styles.input}
                    disabled={fetchingBills}
                  />
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
                <Checkbox.Item
                  label="Create bank transaction record"
                  status={formData.createBankTransaction ? 'checked' : 'unchecked'}
                  onPress={() => setFormData(prev => ({ ...prev, createBankTransaction: !prev.createBankTransaction }))}
                  style={styles.checkbox}
                />
              </Animated.View>

              {formData.createBankTransaction && (
                <Animated.View entering={FadeInDown.duration(300).delay(600)}>
                  <Menu
                    visible={showBankAccountModal}
                    onDismiss={() => setShowBankAccountModal(false)}
                    anchor={
                      <Button
                        mode="outlined"
                        onPress={() => setShowBankAccountModal(true)}
                        style={styles.input}
                        contentStyle={styles.creditorButton}
                        disabled={fetchingAccounts}
                      >
                        {bankAccounts.find(acc => acc.id === formData.bankAccountId)?.name || 'Select Bank Account'}
                        <ChevronDown size={20} style={styles.chevron} />
                      </Button>
                    }
                  >
                    {bankAccounts.map((account) => (
                      <Menu.Item
                        key={account.id}
                        onPress={() => {
                          setFormData(prev => ({ ...prev, bankAccountId: account.id }));
                          setShowBankAccountModal(false);
                        }}
                        title={`${account.name} (${account.account_type}) - ₹${account.current_balance.toLocaleString()}`}
                      />
                    ))}
                  </Menu>
                  {errors.bankAccountId && (
                    <HelperText type="error">{errors.bankAccountId}</HelperText>
                  )}
                </Animated.View>
              )}

              <Button
                mode="text"
                onPress={() => setShowAdditionalFields(!showAdditionalFields)}
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

      <Portal>
        <Modal
          visible={showBillModal}
          onDismiss={() => setShowBillModal(false)}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Bill</Text>
            {bills.map(bill => (
              <List.Item
                key={bill.id}
                title={bill.bill_number}
                description={`Amount: ₹${bill.total_amount.toLocaleString()}`}
                onPress={() => {
                  setFormData(prev => ({ ...prev, billId: bill.id }));
                  setShowBillModal(false);
                }}
              />
            ))}
          </View>
        </Modal>
      </Portal>
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
    marginBottom: 8,
  },
  toggleButton: {
    marginVertical: 8,
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
  modal: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 12,
    padding: 16,
  },
  modalContent: {
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
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
  creditorButton: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 8,
  },
}); 