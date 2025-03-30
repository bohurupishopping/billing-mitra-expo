import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions } from 'react-native';
import { Text, TextInput, Button, HelperText, Checkbox, Portal, Modal, List, Menu } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { IndianRupee, CreditCard, User, FileText, Calendar, ChevronDown, ChevronUp, ArrowLeft, Save } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { Payment, Creditor, BankAccount, Bill, fetchCreditors, fetchBankAccounts, fetchBillsForCreditor } from '../../lib/api/payments';
import { supabase } from '@/lib/supabase';

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
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const [showCreditorModal, setShowCreditorModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);

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
        <View style={styles.loadingContainer}>
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
              icon={() => <Save size={20} color="#ffffff" />}
            >
              Save Changes
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
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
  creditorButton: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 8,
  },
});