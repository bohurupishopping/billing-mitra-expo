import { supabase } from '../supabase';

export interface Purchase {
  id: string;
  business_id: string;
  purchase_number: string;
  purchase_date: string;
  creditor_id: string | null;
  description: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
}

export interface Creditor {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  outstanding_amount: number;
  created_at: string;
  updated_at: string;
}

export async function fetchCreditors(businessId: string): Promise<Creditor[]> {
  const { data, error } = await supabase
    .from('creditors')
    .select('*')
    .eq('business_id', businessId)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function generatePurchaseNumber(businessId: string): Promise<string> {
  const { data, error } = await supabase
    .from('purchases')
    .select('purchase_number')
    .eq('business_id', businessId)
    .order('purchase_number', { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextNumber = 1;
  if (data && data.length > 0 && data[0].purchase_number) {
    const match = data[0].purchase_number.match(/PUR-(\d+)/);
    if (match && match[1]) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `PUR-${nextNumber.toString().padStart(4, '0')}`;
}

export async function createPurchase(purchase: Omit<Purchase, 'id' | 'created_at' | 'updated_at'>): Promise<Purchase> {
  const { data, error } = await supabase
    .from('purchases')
    .insert(purchase)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCreditorOutstandingAmount(creditorId: string, newAmount: number): Promise<void> {
  const { error } = await supabase
    .from('creditors')
    .update({ outstanding_amount: newAmount })
    .eq('id', creditorId);

  if (error) throw error;
} 