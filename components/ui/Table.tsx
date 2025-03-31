import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router'; // Assuming navigation might be needed
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ChevronRight, ChevronLeft } from 'lucide-react-native'; // Added ChevronLeft

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
  // Pagination Props
  currentPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number; // Added itemsPerPage prop
}

const ITEMS_PER_PAGE = 12; // Default items per page

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
  // Pagination Props
  currentPage: initialCurrentPage = 1, // Default to page 1 if not provided
  totalItems,
  onPageChange,
  itemsPerPage = ITEMS_PER_PAGE, // Use default or provided value
}: TableProps<T>) {

  const [currentPage, setCurrentPage] = useState(initialCurrentPage);

  // Update internal state if the prop changes
  React.useEffect(() => {
    setCurrentPage(initialCurrentPage);
  }, [initialCurrentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  // Calculate pagination details only if pagination props are provided
  const isPaginated = typeof totalItems === 'number' && typeof handlePageChange === 'function';
  const totalPages = isPaginated ? Math.ceil(totalItems / itemsPerPage) : 1;
  const startIndex = isPaginated ? (currentPage - 1) * itemsPerPage : 0;
  const endIndex = isPaginated ? Math.min(startIndex + itemsPerPage, totalItems) : data.length; // Ensure endIndex doesn't exceed totalItems
  const paginatedData = isPaginated ? data.slice(startIndex, endIndex) : data; // Use full data if not paginated

  if (loading) {
    // Optional: Add a loading indicator component here
    return <Text>Loading...</Text>;
  }

  // Use paginatedData length for empty check when paginated
  const displayData = isPaginated ? paginatedData : data;
  if (!displayData || displayData.length === 0) {
    if (EmptyStateComponent) {
      return <EmptyStateComponent />;
    }
    // Show a different message if it's paginated but the current page is empty
    const message = isPaginated && data.length > 0 ? `No items on page ${currentPage}` : emptyMessage;
    return <Text style={styles.emptyText}>{message}</Text>;
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

      {/* Data Rows - Use displayData */}
      {displayData.map((item, index) => (
        <AnimatedView
          key={getKey(item)}
          // Adjust delay calculation based on the original index if needed, or keep simple
          entering={FadeInUp.duration(300).delay(index * 50)}
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

      {/* Pagination Controls */}
      {isPaginated && totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <Pressable
            onPress={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={({ pressed }) => [
              styles.paginationButton,
              currentPage === 1 && styles.paginationButtonDisabled,
              pressed && currentPage !== 1 && styles.paginationButtonPressed,
            ]}
          >
            <ChevronLeft size={18} color={currentPage === 1 ? '#94a3b8' : '#475569'} />
            <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
              Prev
            </Text>
          </Pressable>

          <Text style={styles.paginationText}>
            Page {currentPage} of {totalPages}
          </Text>

          <Pressable
            onPress={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={({ pressed }) => [
              styles.paginationButton,
              currentPage === totalPages && styles.paginationButtonDisabled,
              pressed && currentPage !== totalPages && styles.paginationButtonPressed,
            ]}
          >
            <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
              Next
            </Text>
            <ChevronRight size={18} color={currentPage === totalPages ? '#94a3b8' : '#475569'} />
          </Pressable>
        </View>
      )}
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
  // Pagination Styles
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc', // Slightly different background for pagination
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  paginationButtonPressed: {
    backgroundColor: '#e2e8f0',
  },
  paginationButtonDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginHorizontal: 4,
  },
  paginationButtonTextDisabled: {
    color: '#94a3b8',
  },
  paginationText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
});

export default Table;
