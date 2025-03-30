import { supabase } from '@/lib/supabase';

export interface Transaction {
  id: string;
  business_id: string;
  account_id: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionResponse {
  data: Transaction[] | null;
  error: string | null;
}

export interface TransactionDetailResponse {
  data: Transaction | null;
  error: string | null;
}

export async function getTransactions(
  accountId: string,
  businessId: string
): Promise<TransactionResponse> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .eq('business_id', businessId)
      .order('date', { ascending: false });

    if (error) throw error;

    return {
      data: data as Transaction[],
      error: null
    };
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return {
      data: null,
      error: error.message || 'Failed to fetch transactions'
    };
  }
}

export async function getTransaction(
  id: string,
  businessId: string
): Promise<TransactionDetailResponse> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error) throw error;

    return {
      data: data as Transaction,
      error: null
    };
  } catch (error: any) {
    console.error('Error fetching transaction:', error);
    return {
      data: null,
      error: error.message || 'Failed to fetch transaction'
    };
  }
}

export async function createTransaction(
  businessId: string,
  transaction: Omit<Transaction, 'id' | 'business_id' | 'created_at' | 'updated_at'>
): Promise<TransactionDetailResponse> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          ...transaction,
          business_id: businessId
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Update the account balance
    const amount = transaction.type === 'deposit' ? transaction.amount : -transaction.amount;
    const { error: updateError } = await supabase.rpc('update_account_balance', {
      p_account_id: transaction.account_id,
      p_amount: amount
    });

    if (updateError) throw updateError;

    return {
      data: data as Transaction,
      error: null
    };
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return {
      data: null,
      error: error.message || 'Failed to create transaction'
    };
  }
}

export async function updateTransaction(
  id: string,
  businessId: string,
  updates: Partial<Transaction>
): Promise<TransactionDetailResponse> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw error;

    return {
      data: data as Transaction,
      error: null
    };
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    return {
      data: null,
      error: error.message || 'Failed to update transaction'
    };
  }
}

export async function deleteTransaction(
  id: string,
  businessId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return {
      error: error.message || 'Failed to delete transaction'
    };
  }
} 