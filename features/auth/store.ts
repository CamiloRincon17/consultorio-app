import { create } from 'zustand';
import { supabase } from '../../services/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';

// Tiempo máximo de espera para cualquier operación de auth (ms)
const AUTH_TIMEOUT_MS = 5_000;

/** Promesa que rechaza después de N milisegundos. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`TIMEOUT:${label}`)), ms)
  );
  return Promise.race([promise, timeout]);
}

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  // Actions
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  error: null,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
    });
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        AUTH_TIMEOUT_MS,
        'signIn'
      );
      if (error) {
        let msg = 'Error al iniciar sesión.';
        if (error.message.includes('Invalid login credentials')) {
          msg = 'Correo o contraseña incorrectos.';
        } else if (error.message.includes('Email not confirmed')) {
          msg = 'Debes confirmar tu correo electrónico.';
        } else if (error.message.includes('Too many requests')) {
          msg = 'Demasiados intentos. Espera un momento.';
        }
        set({ error: msg, isLoading: false });
        return false;
      }
      set({ session: data.session, user: data.user, isLoading: false });
      return true;
    } catch (err) {
      const isTimeout = err instanceof Error && err.message.startsWith('TIMEOUT:');
      set({
        error: isTimeout
          ? 'Tiempo de espera agotado. Revisa tu conexión a internet.'
          : 'Error de conexión. Verifica tu internet.',
        isLoading: false,
      });
      return false;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await withTimeout(supabase.auth.signOut(), AUTH_TIMEOUT_MS, 'signOut');
    } catch {
      // Ignorar timeout en signOut — limpiar sesión de todas formas
    }
    set({ session: null, user: null, isLoading: false });
  },

  clearError: () => set({ error: null }),
}));

// ─── Restaurar sesión guardada al abrir la app ────────────────────────────────
// Estrategia INSTANTÁNEA:
// 1. Leer sesión cacheada desde AsyncStorage directamente (SIN RED, ~10ms)
// 2. Si hay sesión → usarla de inmediato → la app abre al instante
// 3. DESPUÉS (en background) verificar con Supabase para refrescar el token
// Esto elimina cualquier "pensamiento" al abrir la app.

async function restoreSessionInstant(): Promise<void> {
  let restoredFromCache = false;

  // ── PASO 1 (INSTANTÁNEO): Leer sesión cacheada de AsyncStorage ──────────
  // El SDK de Supabase guarda la sesión bajo claves que empiezan con "sb-"
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const sessionKey = allKeys.find(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (sessionKey) {
      const raw = await AsyncStorage.getItem(sessionKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const sessionObj = parsed?.currentSession ?? parsed;
        if (sessionObj?.access_token) {
          // ¡Sesión encontrada! → Abrir la app de inmediato
          useAuthStore.getState().setSession(sessionObj as any);
          restoredFromCache = true;
          console.log('⚡ Sesión restaurada desde caché local (instantáneo)');
        }
      }
    }
  } catch (cacheErr) {
    console.warn('⚠️ No se pudo leer caché de sesión:', cacheErr);
  }

  // Si no hay sesión en caché → mostrar login de inmediato (sin esperar red)
  if (!restoredFromCache) {
    useAuthStore.setState({ isLoading: false });
  }

  // ── PASO 2 (BACKGROUND): Verificar/refrescar sesión con Supabase ────────
  // Esto corre DESPUÉS de que la app ya se mostró al usuario
  setTimeout(async () => {
    try {
      const { data } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_TIMEOUT_MS,
        'getSession'
      );
      // Actualizar con sesión fresca (token refrescado)
      if (data.session) {
        useAuthStore.getState().setSession(data.session);
      } else if (restoredFromCache) {
        // Sesión en caché pero el servidor dice que no es válida → cerrar sesión
        console.warn('⚠️ Sesión expirada — se requiere re-login');
        useAuthStore.setState({ session: null, user: null, isLoading: false });
      }
    } catch (err) {
      // Sin internet o timeout — no pasa nada, seguimos con la sesión del caché
      console.log('📡 No se pudo verificar sesión con el servidor (se usará caché)');
    }
  }, 100); // 100ms delay para no bloquear el render inicial
}

restoreSessionInstant();

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session);
});
