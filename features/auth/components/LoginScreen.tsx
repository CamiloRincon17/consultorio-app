import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store';

const { width } = Dimensions.get('window');

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  // Estado LOCAL para el botón — no depende del isLoading global del store
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signIn = useAuthStore((s) => s.signIn);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 700,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Shake animation on error
  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [error]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setIsSubmitting(true);
    await signIn(email.trim().toLowerCase(), password);
    setIsSubmitting(false);
  };

  const isDisabled = !email || !password || isSubmitting;

  return (
    <LinearGradient
      colors={['#0A1628', '#0D2444', '#0A3A6B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      {/* Decorative blobs */}
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.inner}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ── Logo / Header ── */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: logoScale }],
              },
            ]}
          >
            <View style={styles.logoWrapper}>
              <LinearGradient
                colors={['#2196F3', '#1565C0']}
                style={styles.logoCircle}
              >
                <Ionicons name="medkit" size={42} color="#fff" />
              </LinearGradient>
              <View style={styles.logoPulse} />
            </View>
            <Text style={styles.appName}>Consultorio</Text>
            <Text style={styles.subtitle}>Gestión dental profesional</Text>
          </Animated.View>

          {/* ── Card ── */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: cardSlide }, { translateX: shakeAnim }],
              },
            ]}
          >
            <Text style={styles.cardTitle}>Iniciar sesión</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <View style={[styles.inputRow, emailFocused && styles.inputRowFocused]}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailFocused ? '#2196F3' : 'rgba(255,255,255,0.4)'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="doctor@consultorio.com"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={email}
                  onChangeText={(t) => { setEmail(t); clearError(); }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Contraseña */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={[styles.inputRow, passwordFocused && styles.inputRowFocused]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passwordFocused ? '#2196F3' : 'rgba(255,255,255,0.4)'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearError(); }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="rgba(255,255,255,0.4)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Botón */}
            <TouchableOpacity
              style={[styles.btnWrapper, isDisabled && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={isDisabled}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isDisabled ? ['#334155', '#334155'] : ['#2196F3', '#1565C0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.btnText}>Ingresar</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <Animated.Text style={[styles.footer, { opacity: fadeAnim }]}>
            ¿Sin acceso? Contacta al administrador del sistema.
          </Animated.Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  blobTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
  },
  blobBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(21, 101, 192, 0.15)',
  },
  safe: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },
  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    gap: 10,
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  logoPulse: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 52,
    borderWidth: 1.5,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
  },
  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  // ── Inputs ───────────────────────────────────────────────────────────────────
  inputGroup: { gap: 8 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    height: 54,
  },
  inputRowFocused: {
    borderColor: '#2196F3',
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  eyeBtn: { padding: 6 },
  // ── Error ────────────────────────────────────────────────────────────────────
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  // ── Botón ────────────────────────────────────────────────────────────────────
  btnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  btnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  btn: {
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
});
