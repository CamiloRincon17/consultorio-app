import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'app_settings_v1';

interface SettingsState {
  theme: ThemePreference;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'system',
  isLoaded: false,
  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const theme: ThemePreference = (parsed.theme as ThemePreference) ?? 'system';
        Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
        set({ theme, isLoaded: true });
        return;
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    set({ isLoaded: true });
  },
  setTheme: async (theme: ThemePreference) => {
    Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
    set({ theme });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ theme }));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  },
}));
