import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BankAccountFormData } from '@/types/banking';
import { useTheme } from '@/theme';

const bankAccountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  account_number: z.string().optional(),
  account_type: z.string().min(1, 'Account type is required'),
  opening_balance: z.string().min(1, 'Opening balance is required'),
});

interface BankAccountFormProps {
  initialData?: BankAccountFormData;
  onSubmit: (data: BankAccountFormData) => void;
  isLoading?: boolean;
}

export function BankAccountForm({ initialData, onSubmit, isLoading }: BankAccountFormProps) {
  const { colors } = useTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: initialData || {
      name: '',
      account_number: '',
      account_type: '',
      opening_balance: '',
    },
  });

  return (
    <View className="space-y-4">
      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Account Name</Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Enter account name"
              className="border border-gray-300 rounded-md px-4 py-2"
              placeholderTextColor={colors.gray[400]}
            />
          )}
        />
        {errors.name && (
          <Text className="text-sm text-red-600 mt-1">{errors.name.message}</Text>
        )}
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Account Number (Optional)</Text>
        <Controller
          control={control}
          name="account_number"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Enter account number"
              className="border border-gray-300 rounded-md px-4 py-2"
              placeholderTextColor={colors.gray[400]}
              keyboardType="numeric"
            />
          )}
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Account Type</Text>
        <Controller
          control={control}
          name="account_type"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Enter account type (e.g., checking, savings)"
              className="border border-gray-300 rounded-md px-4 py-2"
              placeholderTextColor={colors.gray[400]}
            />
          )}
        />
        {errors.account_type && (
          <Text className="text-sm text-red-600 mt-1">{errors.account_type.message}</Text>
        )}
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Opening Balance</Text>
        <Controller
          control={control}
          name="opening_balance"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Enter opening balance"
              className="border border-gray-300 rounded-md px-4 py-2"
              placeholderTextColor={colors.gray[400]}
              keyboardType="numeric"
            />
          )}
        />
        {errors.opening_balance && (
          <Text className="text-sm text-red-600 mt-1">{errors.opening_balance.message}</Text>
        )}
      </View>

      <TouchableOpacity
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
        className={`bg-indigo-600 rounded-md py-3 px-4 ${
          isLoading ? 'opacity-50' : ''
        }`}
      >
        <Text className="text-white text-center font-medium">
          {isLoading ? 'Saving...' : initialData ? 'Update Account' : 'Create Account'}
        </Text>
      </TouchableOpacity>
    </View>
  );
} 