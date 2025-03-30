import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Platform } from 'react-native';
import { Modal, Portal, Text, TextInput, List, ActivityIndicator, Divider, Searchbar } from 'react-native-paper';
import { X } from 'lucide-react-native';

const { height } = Dimensions.get('window');

interface Item {
  id: string;
  [key: string]: any; // Allow other properties
}

interface SearchableSelectModalProps<T extends Item> {
  visible: boolean;
  onDismiss: () => void;
  items: T[];
  onSelect: (item: T | null) => void; // Allow null for clearing selection
  title: string;
  labelKey: keyof T | ((item: T) => string); // Key for the main label or a function to format it
  descriptionKey?: keyof T | ((item: T) => string); // Optional key for description or a function
  searchKeys: (keyof T)[]; // Keys to search against
  loading?: boolean;
  allowClear?: boolean; // Option to add a "Clear" or "None" item
  clearLabel?: string; // Label for the clear option
}

export function SearchableSelectModal<T extends Item>({
  visible,
  onDismiss,
  items,
  onSelect,
  title,
  labelKey,
  descriptionKey,
  searchKeys,
  loading = false,
  allowClear = false,
  clearLabel = 'None',
}: SearchableSelectModalProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  const getDisplayValue = (item: T, key: keyof T | ((item: T) => string) | undefined): string | undefined => {
    if (!key) return undefined;
    if (typeof key === 'function') {
      return key(item);
    }
    return item[key]?.toString();
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) {
      return items;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return items.filter(item =>
      searchKeys.some(key => {
        const value = item[key];
        return value && value.toString().toLowerCase().includes(lowerCaseQuery);
      })
    );
  }, [items, searchQuery, searchKeys]);

  const handleSelect = (item: T | null) => {
    onSelect(item);
    setSearchQuery(''); // Reset search on select
    onDismiss();
  };

  const renderItem = ({ item }: { item: T }) => (
    <List.Item
      title={getDisplayValue(item, labelKey)}
      description={getDisplayValue(item, descriptionKey)}
      onPress={() => handleSelect(item)}
      titleStyle={styles.itemTitle}
      descriptionStyle={styles.itemDescription}
    />
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
        style={styles.modalWrapper} // Ensures modal is centered and handles backdrop
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TextInput.Icon icon={() => <X size={20} color="#64748b" />} onPress={onDismiss} />
          </View>
          <Searchbar
            placeholder="Search..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            inputStyle={styles.searchInput}
            elevation={0}
          />
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator animating={true} size="large" />
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <Divider style={styles.divider} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No items found.</Text>
                </View>
              }
              ListHeaderComponent={allowClear ? (
                <>
                  <List.Item
                    title={clearLabel}
                    onPress={() => handleSelect(null)}
                    titleStyle={[styles.itemTitle, styles.clearItem]}
                  />
                  <Divider style={styles.divider} />
                </>
              ) : null}
              style={styles.list} // Ensure FlatList takes up available space
            />
          )}
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalWrapper: {
    justifyContent: 'center', // Center modal vertically
    alignItems: 'center', // Center modal horizontally
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 0, // Padding is handled internally by modalContent
    width: '90%', // Responsive width
    maxHeight: height * 0.7, // Max height to prevent overflow
    overflow: 'hidden', // Ensures content respects border radius
    elevation: 5, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalContent: {
    display: 'flex', // Use flexbox for layout
    flexDirection: 'column',
    height: '100%', // Take full height of the container
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  searchbar: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  searchInput: {
    fontSize: 14,
  },
  list: {
    flex: 1, // Allows FlatList to scroll within the modal height
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
  itemTitle: {
    fontSize: 15,
    color: '#1e293b',
  },
  itemDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  clearItem: {
    color: '#4f46e5', // Use primary color for clear option
    fontStyle: 'italic',
  },
  divider: {
    backgroundColor: '#e2e8f0',
  },
});

export default SearchableSelectModal;