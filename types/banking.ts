export interface BankAccount {
  id: string;
  business_id: string;
  name: string;
  account_number?: string;
  account_type: string;
  opening_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  account_id: string;
  reference_id?: string;
  transaction_number: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  date: string;
  description?: string;
  category?: string;
  reconciled: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionFormData {
  account_id: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  date: string;
  description?: string;
  category?: string;
  notes?: string;
  reference_id?: string;
}

export interface BankAccountFormData {
  name: string;
  account_number?: string;
  account_type: string;
  opening_balance: number;
} 