import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SpecialistBlock, SyncStatus } from "./types";
import { generateId } from "../../shared/utils/generateId";
import {
  insertSpecialistBlock,
  updateSpecialistBlockDb,
  deleteSpecialistBlockDb,
  insertSavedDoctor,
  deleteSavedDoctorDb,
} from "../../services/supabase/specialistsService";
import { enqueueIfOffline } from "../../services/offlineQueue";

const SPECIALIST_BLOCKS_CACHE_KEY = "SPECIALIST_BLOCKS_LOCAL_CACHE";
const SAVED_DOCTORS_CACHE_KEY = "SAVED_DOCTORS_LOCAL_CACHE";

export interface SavedDoctor {
  id: string;
  name: string;
  specialty?: string;
  _syncStatus?: SyncStatus;
}

interface SpecialistState {
  specialistBlocks: SpecialistBlock[];
  savedDoctors: SavedDoctor[];
  isLoading: boolean;
  setSpecialistBlocks: (blocks: SpecialistBlock[]) => void;
  setSavedDoctors: (doctors: SavedDoctor[]) => void;
  loadFromCache: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
  addSpecialistBlock: (block: Omit<SpecialistBlock, "id">) => void;
  updateSpecialistBlock: (id: string, updates: Partial<SpecialistBlock>) => void;
  deleteSpecialistBlock: (id: string) => void;
  removeSpecialistBlock: (id: string) => void;
  markBlockSynced: (id: string) => void;
  addSavedDoctor: (name: string, specialty?: string) => void;
  deleteSavedDoctor: (id: string) => void;
  /** Marca un doctor guardado como sincronizado con Supabase. */
  markDoctorSynced: (id: string) => void;
}

/** Guarda los bloques en AsyncStorage */
async function saveBlocksToCache(blocks: SpecialistBlock[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SPECIALIST_BLOCKS_CACHE_KEY, JSON.stringify(blocks));
  } catch {
    // Silencioso
  }
}

/** Guarda los doctores guardados en AsyncStorage */
async function saveDoctorsToCache(doctors: SavedDoctor[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVED_DOCTORS_CACHE_KEY, JSON.stringify(doctors));
  } catch {
    // Silencioso
  }
}

/** Helper: ejecuta una operación Supabase y, si falla por red, la encola. */
async function persistWithRetry(
  fn: () => Promise<void>,
  method: string,
  args: any[],
): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (error) {
    const queued = await enqueueIfOffline(error, 'specialists', method, args);
    if (!queued) {
      console.error(`❌ Supabase specialists.${method}:`, error);
    }
    return false;
  }
}

export const useSpecialistStore = create<SpecialistState>((set, get) => ({
  specialistBlocks: [],
  savedDoctors: [],
  isLoading: false,

  setSpecialistBlocks: (cloudBlocks) => {
    const currentState = get();
    const cloudIds = new Set(cloudBlocks.map((b) => b.id));

    // Preservar bloques locales pendientes que aún no han subido
    const pendingLocal = currentState.specialistBlocks.filter(
      (b) => b._syncStatus === 'pending' && !cloudIds.has(b.id)
    );

    const synced = cloudBlocks.map((b) => ({
      ...b,
      _syncStatus: 'synced' as SyncStatus,
    }));

    const merged = [...pendingLocal, ...synced];
    set({ specialistBlocks: merged, isLoading: false });
    saveBlocksToCache(merged);
  },

  setSavedDoctors: (cloudDoctors) => {
    const currentState = get();
    const cloudIds = new Set(cloudDoctors.map((d) => d.id));

    // Preservar doctores locales pendientes que aún no subieron a la nube
    const pendingLocal = currentState.savedDoctors.filter(
      (d) => d._syncStatus === 'pending' && !cloudIds.has(d.id)
    );

    const synced = cloudDoctors.map((d) => ({
      ...d,
      _syncStatus: 'synced' as SyncStatus,
    }));

    const merged = [...pendingLocal, ...synced];
    set({ savedDoctors: merged });
    saveDoctorsToCache(merged);
  },

  loadFromCache: async () => {
    try {
      const cachedBlocks = await AsyncStorage.getItem(SPECIALIST_BLOCKS_CACHE_KEY);
      const cachedDoctors = await AsyncStorage.getItem(SAVED_DOCTORS_CACHE_KEY);

      let blocks: SpecialistBlock[] = [];
      let doctors: SavedDoctor[] = [];

      if (cachedBlocks) {
        blocks = JSON.parse(cachedBlocks);
      }

      if (cachedDoctors) {
        doctors = JSON.parse(cachedDoctors);
      }

      set({ specialistBlocks: blocks, savedDoctors: doctors, isLoading: false });
      return true;
    } catch (e) {
      console.warn("Error cargando caché de especialistas:", e);
    }
    set({ isLoading: false });
    return false;
  },

  setLoading: (loading) => set({ isLoading: loading }),

  addSavedDoctor: (name: string, specialty?: string) => {
    const nameTrimmed = name.trim();
    if (!nameTrimmed) return;

    const current = get().savedDoctors;
    const exists = current.some((d) => d.name.toLowerCase() === nameTrimmed.toLowerCase());
    if (exists) return;

    const newDoctor: SavedDoctor = {
      id: generateId(),
      name: nameTrimmed,
      specialty: specialty?.trim() || undefined,
      _syncStatus: 'pending',
    };

    const updated = [newDoctor, ...current];
    set({ savedDoctors: updated });
    saveDoctorsToCache(updated);

    // Persistir en Supabase
    persistWithRetry(
      () => insertSavedDoctor(newDoctor),
      'insertSavedDoctor',
      [newDoctor],
    );
  },

  markDoctorSynced: (id: string) => {
    set((state) => ({
      savedDoctors: state.savedDoctors.map((d) =>
        d.id === id ? { ...d, _syncStatus: 'synced' as SyncStatus } : d
      ),
    }));
    saveDoctorsToCache(get().savedDoctors);
  },

  deleteSavedDoctor: (id: string) => {
    const updated = get().savedDoctors.filter((d) => d.id !== id);
    set({ savedDoctors: updated });
    saveDoctorsToCache(updated);

    // Persistir eliminación en Supabase
    persistWithRetry(
      () => deleteSavedDoctorDb(id),
      'deleteSavedDoctorDb',
      [id],
    );
  },

  addSpecialistBlock: (blockData) => {
    const newBlock: SpecialistBlock = {
      ...blockData,
      id: generateId(),
      _syncStatus: "pending",
      _lastModified: new Date().toISOString(),
    };
    const updated = [newBlock, ...get().specialistBlocks];
    set({ specialistBlocks: updated });
    saveBlocksToCache(updated);

    // Auto guardar el doctor en la lista de doctores frecuentes
    if (blockData.doctorName) {
      get().addSavedDoctor(blockData.doctorName, blockData.specialty);
    }

    // Persistir en Supabase con cola offline
    persistWithRetry(
      () => insertSpecialistBlock(newBlock),
      'insertSpecialistBlock',
      [newBlock],
    ).then((success) => {
      if (success) {
        useSpecialistStore.getState().markBlockSynced(newBlock.id);
      }
    });
  },

  updateSpecialistBlock: (id, updates) => {
    const updated = get().specialistBlocks.map((b) => {
      if (b.id !== id) return b;
      return {
        ...b,
        ...updates,
        _lastModified: new Date().toISOString(),
      };
    });
    set({ specialistBlocks: updated });
    saveBlocksToCache(updated);

    if (updates.doctorName) {
      get().addSavedDoctor(updates.doctorName, updates.specialty);
    }

    // Persistir en Supabase con cola offline
    persistWithRetry(
      () => updateSpecialistBlockDb(id, updates),
      'updateSpecialistBlockDb',
      [id, updates],
    );
  },

  deleteSpecialistBlock: (id) => {
    const updated = get().specialistBlocks.filter((b) => b.id !== id);
    set({ specialistBlocks: updated });
    saveBlocksToCache(updated);

    // Persistir eliminación en Supabase
    persistWithRetry(
      () => deleteSpecialistBlockDb(id),
      'deleteSpecialistBlockDb',
      [id],
    );
  },

  removeSpecialistBlock: (id) => {
    const updated = get().specialistBlocks.filter((b) => b.id !== id);
    set({ specialistBlocks: updated });
    saveBlocksToCache(updated);
  },

  markBlockSynced: (id: string) => {
    set((state) => ({
      specialistBlocks: state.specialistBlocks.map((b) =>
        b.id === id ? { ...b, _syncStatus: 'synced' as SyncStatus } : b
      ),
    }));
    saveBlocksToCache(get().specialistBlocks);
  },
}));
