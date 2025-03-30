import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, Menu } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { IndianRupee, ArrowLeft, Save, ChevronDown } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  fetchCreditors, 
  createPurchase, 
  updateCreditorOutstandingAmount, 
  Creditor,
  Purchase 
} from '../../../lib/api/purchases';

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

export default function EditPurchaseScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { selectedBusiness } = useBusiness();
  
  const [formData, setFormData] = useState<FormData>({
    purchaseNumber: '',
    purchaseDate: '',
    creditorId: '',
    description: '',
    itemName: '',
    quantity: '',
    unitPrice: '',
    totalPrice: '',
  });
  
  const [originalData, setOriginalData] = useState<Purchase | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [showCreditorMenu, setShowCreditorMenu] = useState(false);

  useEffect(() => {
    if (selectedBusiness && id) {
      fetchPurchase();
      loadCreditors();
    }
  }, [selectedBusiness, id]);

  useEffect(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const unitPrice = parseFloat(formData.unitPrice) || 0;
    const totalPrice = (quantity * unitPrice).toFixed(2);
    
    setFormData(prev => ({
      ...prev,
      totalPrice
    }));
  }, [formData.quantity, formData.unitPrice]);

  const fetchPurchase = async () => {
    if (!selectedBusiness || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setOriginalData(data);
        setFormData({
          purchaseNumber: data.purchase_number,
          purchaseDate: new Date(data.purchase_date).toISOString().split('T')[0],
          creditorId: data.creditor_id || '',
          description: data.description || '',
          itemName: data.item_name,
          quantity: data.quantity.toString(),
          unitPrice: data.unit_price.toString(),
          totalPrice: data.total_price.toString(),
        });
      } else {
        router.back();
      }
    } catch (err) {
      console.error('Error fetching purchase:', err);
      setErrors(prev => ({ ...prev, submit: 'Failed to load purchase' }));
      router.back();
    } finally {
      setFetchLoading(false);
    }
  };

  const loadCreditors = async () => {
    if (!selectedBusiness) return;
    
    try {
      const creditorsList = await fetchCreditors(selectedBusiness.id);
      setCreditors(creditorsList);
    } catch (err) {
      console.error('Error fetching creditors:', err);
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
    if (!validateForm() || !selectedBusiness || !id || !originalData) return;
    
    setLoading(true);
    
    try {
      // Calculate amount difference to update creditor balances
      const oldTotalPrice = Number(originalData.total_price);
      const newTotalPrice = parseFloat(formData.totalPrice);
      const priceDifference = newTotalPrice - oldTotalPrice;
      
      // Update purchase
      const { error } = await supabase
        .from('purchases')
        .update({
          purchase_number: formData.purchaseNumber,
          purchase_date: formData.purchaseDate,
          creditor_id: formData.creditorId || null,
          description: formData.description || null,
          item_name: formData.itemName,
          quantity: parseFloat(formData.quantity),
          unit_price: parseFloat(formData.unitPrice),
          total_price: parseFloat(formData.totalPrice)
        })
        .eq('id', id)
        .eq('business_id', selectedBusiness.id);
        
      if (error) throw error;
      
      // Handle creditor updates
      const oldCreditorId = originalData.creditor_id;
      const newCreditorId = formData.creditorId;
      
      // If creditor has changed
      if (oldCreditorId !== newCreditorId) {
        // Remove amount from old creditor if there was one
        if (oldCreditorId) {
          const { data: oldCreditor } = await supabase
            .from('creditors')
            .select('outstanding_amount')
            .eq('id', oldCreditorId)
            .single();
            
          if (oldCreditor) {
            const newOutstandingAmount = Math.max(0, Number(oldCreditor.outstanding_amount) - oldTotalPrice);
            await updateCreditorOutstandingAmount(oldCreditorId, newOutstandingAmount);
          }
        }
        
        // Add amount to new creditor if there is one
        if (newCreditorId) {
          const { data: newCreditor } = await supabase
            .from('creditors')
            .select('outstanding_amount')
            .eq('id', newCreditorId)
            .single();
            
          if (newCreditor) {
            const newOutstandingAmount = Number(newCreditor.outstanding_amount) + newTotalPrice;
            await updateCreditorOutstandingAmount(newCreditorId, newOutstandingAmount);
          }
        }
      } 
      // If same creditor but amount changed
      else if (oldCreditorId && priceDifference !== 0) {
        const { data: creditor } = await supabase
          .from('creditors')
          .select('outstanding_amount')
          .eq('id', oldCreditorId)
          .single();
          
        if (creditor) {
          const newOutstandingAmount = Number(creditor.outstanding_amount) + priceDifference;
          await updateCreditorOutstandingAmount(oldCreditorId, newOutstandingAmount);
        }
      }
      
      router.back();
    } catch (err) {
      console.error('Error updating purchase:', err);
      setErrors(prev => ({ ...prev, submit: 'Failed to update purchase' }));
    } finally {
      setLoading(false);
    }
  };

  const selectedCreditor = creditors.find(c => c.id === formData.creditorId);

  if (fetchLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading purchase details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e40af', '#1e3a8a']}
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
            <Text variant="titleLarge" style={styles.title}>Edit Purchase</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Update purchase information
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
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
            <Menu
              visible={showCreditorMenu}
              onDismiss={() => setShowCreditorMenu(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setShowCreditorMenu(true)}
                  style={styles.input}
                  contentStyle={styles.creditorButton}
                >
                  {selectedCreditor ? selectedCreditor.name : 'Select Supplier (Optional)'}
                  <ChevronDown size={20} style={styles.chevron} />
                </Button>
              }
            >
              <Menu.Item
                onPress={() => {
                  setFormData(prev => ({ ...prev, creditorId: '' }));
                  setShowCreditorMenu(false);
                }}
                title="No Supplier"
              />
              {creditors.map((creditor) => (
                <Menu.Item
                  key={creditor.id}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, creditorId: creditor.id }));
                    setShowCreditorMenu(false);
                  }}
                  title={creditor.name}
                />
              ))}
            </Menu>
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
              Save Changes
            </Button>
          </View>
        </View>
      </ScrollView>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
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
    marginBottom: 8,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 8,
  },
});