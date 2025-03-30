import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { Portal } from 'react-native-paper'; // Import Portal
import BottomNavigation from '@/components/BottomNavigation';

export default function AppLayout() {
  return (
    // Wrap with Portal.Host to manage modals rendered via Portal
    <Portal.Host> 
      <View style={styles.container}>
        <Slot />
        <BottomNavigation />
      </View>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
