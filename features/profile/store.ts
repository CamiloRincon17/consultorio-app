import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Datos personales del doctor ──────────────────────────────────────────────
// Se llenan y editan manualmente desde la pantalla "Perfil del doctor".
// No se toman de ninguna otra fuente; solo de lo que el usuario escriba.
export interface DoctorProfile {
  fullName: string;
  specialization: string;
  licenseNumber: string;
  phone: string;
  email: string;
  clinicName: string;
  address: string;
}

export const EMPTY_PROFILE: DoctorProfile = {
  fullName: '',
  specialization: '',
  licenseNumber: '',
  phone: '',
  email: '',
  clinicName: '',
  address: '',
};

const STORAGE_KEY = 'doctor_profile_v1';

interface ProfileState {
  profile: DoctorProfile;
  isLoaded: boolean;
  loadProfile: () => Promise<void>;
  saveProfile: (updates: Partial<DoctorProfile>) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: EMPTY_PROFILE,
  isLoaded: false,

  loadProfile: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        set({ profile: { ...EMPTY_PROFILE, ...JSON.parse(raw) }, isLoaded: true });
        return;
      }
    } catch (e) {
      console.warn('⚠️ No se pudo cargar el perfil del doctor:', e);
    }
    set({ isLoaded: true });
  },

  saveProfile: async (updates) => {
    const next = { ...get().profile, ...updates };
    set({ profile: next });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('⚠️ No se pudo guardar el perfil del doctor:', e);
    }
  },
}));
