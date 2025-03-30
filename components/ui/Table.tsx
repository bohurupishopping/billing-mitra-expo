import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router'; // Assuming navigation might be needed
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';

const AnimatedView = Animated.createAnimatedComponent(View);

export interface Column<T> {
  key: keyof T | string; // Allow string keys for custom renderers
  header: string;
  flex?: number;
  render?: (item: T) => React.ReactNode; // Custom renderer for a cell
  isNumeric?: boolean; // Align text right for numbers
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  getKey: (item: T) => string; // Function to get a unique key for each row
  onRowPress?: (item: T) => void; // Optional handler for row press
  rowStyle?: object; // Optional style for each row container
  cellStyle?: object; // Optional style for each cell
  headerStyle?: object; // Optional style for header cells
  containerStyle?: object; // Optional style for the table container
  loading?: boolean; // Optional loading state
  emptyMessage?: string; // Message when data is empty
  EmptyStateComponent?: React.ComponentType<any>; // Custom component for empty state
}

export function Table<T>({
  columns,
  data,
  getKey,
  onRowPress,
  rowStyle = {},
  cellStyle = {},
  headerStyle = {},
  containerStyle = {},
  loading = false,
  emptyMessage = "No data available",
  EmptyStateComponent,
}: TableProps<T>) {

  if (loading) {
    // Optional: Add a loading indicator component here
    return <Text>Loading...</Text>;
  }

  if (!data || data.length === 0) {
    if (EmptyStateComponent) {
      return <EmptyStateComponent />;
    }
    return <Text style={styles.emptyText}>{emptyMessage}</Text>;
  }

  return (
    <View style={[styles.tableContainer, containerStyle]}>
      {/* Header Row */}
      <View style={styles.tableHeader}>
        {columns.map((col) => (
          <View key={col.key.toString()} style={[styles.tableCell, { flex: col.flex ?? 1 }, headerStyle]}>
            <Text style={styles.tableHeaderText}>{col.header}</Text>
          </View>
        ))}
        {onRowPress && <View style={styles.chevronPlaceholder} />}
      </View>

      {/* Data Rows */}
      {data.map((item, index) => (
        <AnimatedView
          key={getKey(item)}
          entering={FadeInUp.duration(300).delay(index * 50)} // Shorter delay
          style={[styles.tableRowContainer, index % 2 !== 0 && styles.alternateRow, rowStyle]}
        >
          <Pressable
            onPress={onRowPress ? () => onRowPress(item) : undefined}
            style={({ pressed }) => [
              styles.tableRow,
              pressed && onRowPress && styles.rowPressed,
            ]}
            disabled={!onRowPress}
          >
            {columns.map((col) => (
              <View key={`${getKey(item)}-${col.key.toString()}`} style={[styles.tableCell, { flex: col.flex ?? 1 }, cellStyle]}>
                <Text style={[styles.tableCellText, col.isNumeric && styles.numericText]}>
                  {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '')}
                </Text>
              </View>
            ))}
            {onRowPress && <ChevronRight size={16} color="#64748b" style={styles.chevron} />}
          </Pressable>
        </AnimatedView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tableContainer: {
    gap: 0, // Remove gap between rows for a more traditional table look
    borderWidth: 1,
    borderColor: '#e2e8f0', // Add border around the table
    borderRadius: 8,
    overflow: 'hidden', // Clip content to rounded corners
    backgroundColor: '#ffffff',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9', // Lighter header background
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowContainer: {
    backgroundColor: '#ffffff',
  },
  alternateRow: {
    backgroundColor: '#f8fafc', // Subtle alternating row color
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14, // Slightly more vertical padding
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  rowPressed: {
    backgroundColor: '#f1f5f9', // Feedback on press
  },
  tableCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8, // Add some padding between cells
  },
  tableHeaderText: {
    color: '#475569', // Darker header text
    fontWeight: '600',
    fontSize: 13,
    textTransform: 'uppercase', // Uppercase headers
    letterSpacing: 0.5,
  },
  tableCellText: {
    color: '#1e293b',
    fontSize: 14,
  },
  numericText: {
    textAlign: 'right', // Align numeric data to the right
  },
  chevron: {
    marginLeft: 'auto', // Push chevron to the far right
    paddingLeft: 8,
  },
  chevronPlaceholder: {
    width: 24, // Match chevron size + padding
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#64748b',
    fontSize: 14,
  },
});

export default Table;
