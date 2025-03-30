import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TransactionFormData } from '@/types/banking';
import { useTheme } from '@/theme';
import DateTimePicker from '@react-native-community/datetimepicker';

const transactionSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'transfer']),
  amount: z.string().min(1, 'Amount is required'),
  date: z.date(),
  description: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

interface TransactionFormProps {
  accountId: string;
  initialData?: TransactionFormData;
  onSubmit: (data: TransactionFormData) => void;
  isLoading?: boolean;
}

export function TransactionForm({ accountId, initialData, onSubmit, isLoading }: TransactionFormProps) {
  const { colors } = useTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initialData || {
      type: 'deposit',
      amount: '',
      date: new Date(),
      description: '',
      category: '',
      notes: '',
    },
  });

  return (
    <View className="space-y-4">
      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Transaction Type</Text>
        <Controller
          control={control}
          name="type"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={() => onChange('deposit')}
                className={`flex-1 py-2 px-4 rounded-md ${
                  value === 'deposit' ? 'bg-green-100' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-center ${
                    value === 'deposit' ? 'text-green-800' : 'text-gray-800'
                  }`}
                >
                  Deposit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onChange('withdrawal')}
                className={`flex-1 py-2 px-4 rounded-md ${
                  value === 'withdrawal' ? 'bg-red-100' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-center ${
                    value === 'withdrawal' ? 'text-red-800' : 'text-gray-800'
                  }`}
                >
                  Withdrawal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onChange('transfer')}
                className={`flex-1 py-2 px-4 rounded-md ${
                  value === 'transfer' ? 'bg-blue-100' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-center ${
                    value === 'transfer' ? 'text-blue-800' : 'text-gray-800'
                  }`}
                >
                  Transfer
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
        {errors.type && (
          <Text className="text-sm text-red-600 mt-1">{errors.type.message}</Text>
        )}
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Amount</Text>
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Enter amount"
              className="border border-gray-300 rounded-md px-4 py-2"
              placeholderTextColor={colors.gray[400]}
              keyboardType="numeric"
            />
          )}
        />
        {errors.amount && (
          <Text className="text-sm text-red-600 mt-1">{errors.amount.message}</Text>
        )}
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Date</Text>
        <Controller
          control={control}
          name="date"
          render={({ field: { onChange, value } }) => (
            <DateTimePicker
              value={value}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                onChange(selectedDate || new Date());
              }}
            />
          )}
        />
        {errors.date && (
          <Text className="text-sm text-red-600 mt-1">{errors.date.message}</Text>
        )}
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Description (Optional)</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Enter description"
              className="border border-gray-300 rounded-md px-4 py-2"
              placeholderTextColor={colors.gray[400]}
            />
          )}
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Category (Optional)</Text>
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Enter category"
              className="border border-gray-300 rounded-md px-4 py-2"
              placeholderTextColor={colors.gray[400]}
            />
          )}
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Notes (Optional)</Text>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Enter notes"
              className="border border-gray-300 rounded-md px-4 py-2"
              placeholderTextColor={colors.gray[400]}
              multiline
              numberOfLines={3}
            />
          )}
        />
      </View>

      <TouchableOpacity
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
        className={`bg-indigo-600 rounded-md py-3 px-4 ${
          isLoading ? 'opacity-50' : ''
        }`}
      >
        <Text className="text-white text-center font-medium">
          {isLoading ? 'Saving...' : initialData ? 'Update Transaction' : 'Create Transaction'}
        </Text>
      </TouchableOpacity>
    </View>
  );
} 