import { supabase } from '@/lib/supabase';

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

export interface BankAccountResponse {
  data: BankAccount[] | null;
  error: string | null;
}

export interface BankAccountDetailResponse {
  data: BankAccount | null;
  error: string | null;
}

export async function getBankAccounts(businessId: string): Promise<BankAccountResponse> {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('business_id', businessId)
      .order('name');

    if (error) throw error;

    return {
      data: data as BankAccount[],
      error: null
    };
  } catch (error: any) {
    console.error('Error fetching bank accounts:', error);
    return {
      data: null,
      error: error.message || 'Failed to fetch bank accounts'
    };
  }
}

export async function getBankAccount(id: string, businessId: string): Promise<BankAccountDetailResponse> {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error) throw error;

    return {
      data: data as BankAccount,
      error: null
    };
  } catch (error: any) {
    console.error('Error fetching bank account:', error);
    return {
      data: null,
      error: error.message || 'Failed to fetch bank account'
    };
  }
}

export async function createBankAccount(
  businessId: string,
  account: Omit<BankAccount, 'id' | 'business_id' | 'created_at' | 'updated_at'>
): Promise<BankAccountDetailResponse> {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .insert([
        {
          ...account,
          business_id: businessId
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      data: data as BankAccount,
      error: null
    };
  } catch (error: any) {
    console.error('Error creating bank account:', error);
    return {
      data: null,
      error: error.message || 'Failed to create bank account'
    };
  }
}

export async function updateBankAccount(
  id: string,
  businessId: string,
  updates: Partial<BankAccount>
): Promise<BankAccountDetailResponse> {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .update(updates)
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw error;

    return {
      data: data as BankAccount,
      error: null
    };
  } catch (error: any) {
    console.error('Error updating bank account:', error);
    return {
      data: null,
      error: error.message || 'Failed to update bank account'
    };
  }
}

export async function deleteBankAccount(id: string, businessId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('bank_accounts')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    console.error('Error deleting bank account:', error);
    return {
      error: error.message || 'Failed to delete bank account'
    };
  }
} 