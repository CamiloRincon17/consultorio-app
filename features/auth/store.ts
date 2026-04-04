import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  pin: string | null;
  isAuthenticated: boolean;
  isChecking: boolean;
  setPin: (pin: string) => Promise<void>;
  authenticate: (pin: string) => boolean;
  removePin: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  pin: null,
  isAuthenticated: false,
  isChecking: true,
  
  setPin: async (pin: string) => {
    await AsyncStorage.setItem('STORAGE_KEY_PIN', pin);
    set({ pin, isAuthenticated: true });
  },
  
  authenticate: (inputPin: string) => {
    const isValid = get().pin === inputPin;
    if (isValid) {
      set({ isAuthenticated: true });
    }
    return isValid;
  },
  
  removePin: async () => {
    await AsyncStorage.removeItem('STORAGE_KEY_PIN');
    set({ pin: null, isAuthenticated: true });
  }
}));

// Hydration process outside of React tree
AsyncStorage.getItem('STORAGE_KEY_PIN').then(pin => {
  useAuthStore.setState({ 
    pin, 
    isAuthenticated: !pin, // If no PIN is configured, automatically authenticated
    isChecking: false 
  });
}).catch(e => {
  console.error("Failed to load PIN", e);
  useAuthStore.setState({ isChecking: false, isAuthenticated: true });
});
