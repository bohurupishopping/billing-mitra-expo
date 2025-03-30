import { supabase } from '@/lib/supabase';

export interface Payment {
  id: string;
  business_id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  creditor_id: string | null;
  bank_account_id: string | null;
  payment_method: string;
  reference: string | null;
  notes: string | null;
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

export interface BankAccount {
  id: string;
  business_id: string;
  name: string;
  account_number: string | null;
  account_type: string;
  opening_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: string;
  business_id: string;
  bill_number: string;
  issue_date: string;
  due_date: string;
  creditor_id: string;
  total_amount: number;
  status: string;
  notes: string | null;
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

export async function fetchBankAccounts(businessId: string): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('business_id', businessId)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function fetchBillsForCreditor(businessId: string, creditorId: string): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('business_id', businessId)
    .eq('creditor_id', creditorId)
    .eq('status', 'PENDING')
    .order('issue_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function generatePaymentNumber(businessId: string): Promise<string> {
  const { data, error } = await supabase
    .from('payments')
    .select('payment_number')
    .eq('business_id', businessId)
    .order('payment_number', { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextNumber = 1;
  if (data && data.length > 0 && data[0].payment_number) {
    const match = data[0].payment_number.match(/PAY-(\d+)/);
    if (match && match[1]) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `PAY-${nextNumber.toString().padStart(4, '0')}`;
}

export async function createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
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

export async function updateBillStatus(billId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('bills')
    .update({ status })
    .eq('id', billId);

  if (error) throw error;
}

export async function createBankTransaction(transaction: {
  business_id: string;
  account_id: string;
  transaction_number: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  date: string;
  description: string;
  category: string;
  reference_id: string;
  reconciled: boolean;
  notes: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .insert(transaction);

  if (error) throw error;
} 