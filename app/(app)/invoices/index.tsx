import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function InvoicesScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Invoices</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
});