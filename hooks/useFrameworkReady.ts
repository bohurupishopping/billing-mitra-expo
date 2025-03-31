import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  useEffect(() => {
    async function hideSplash() {
      try {
        // Hide the splash screen once the app is ready
        await SplashScreen.hideAsync();
        // Call web-specific function if it exists
        window.frameworkReady?.();
      } catch (e) {
        console.warn('Error hiding splash screen:', e);
      }
    }

    hideSplash();
  }, []); // Empty dependency array ensures this runs only once on mount
}
