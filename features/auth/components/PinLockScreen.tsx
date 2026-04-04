import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store';
import { Colors } from '../../../shared/constants/Colors';

export const PinLockScreen = () => {
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState(false);
  
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isChecking = useAuthStore(s => s.isChecking);
  const hasPinSet = !!useAuthStore(s => s.pin);
  const setPin = useAuthStore(s => s.setPin);
  const authenticate = useAuthStore(s => s.authenticate);

  if (isChecking || isAuthenticated) return null;

  const handlePress = (num: string) => {
    if (pinInput.length < 4) {
      const newPin = pinInput + num;
      setPinInput(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        setTimeout(() => {
          if (!hasPinSet) {
             setPin(newPin);
          } else {
             const isValid = authenticate(newPin);
             if (!isValid) {
               setError(true);
               setPinInput("");
             }
          }
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Ionicons 
            name={!hasPinSet ? "shield-checkmark" : "lock-closed"} 
            size={70} 
            color={Colors.primary} 
            style={styles.icon} 
          />
          <Text style={styles.title}>
            {!hasPinSet ? "Crea un PIN de Seguridad" : "Introduce tu PIN"}
          </Text>
          <Text style={styles.subtitle}>
            {!hasPinSet ? "Define 4 dígitos para proteger la app" : "Autenticación requerida para acceder"}
          </Text>
        </View>

        <View style={styles.dotsContainer}>
          {[0, 1, 2, 3].map(i => (
            <View 
              key={i} 
              style={[
                styles.dot, 
                pinInput.length > i && styles.dotFilled,
                error && styles.dotError
              ]} 
            />
          ))}
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { opacity: error ? 1 : 0 }]}>
            PIN incorrecto, intenta de nuevo
          </Text>
        </View>

        <View style={styles.padContainer}>
          {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map(num => (
            <TouchableOpacity 
              key={num} 
              style={styles.padButton} 
              onPress={() => handlePress(num.toString())}
              activeOpacity={0.7}
            >
              <Text style={styles.padText}>{num}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.padButtonEmpty} />
          <TouchableOpacity 
            style={styles.padButton} 
            onPress={() => handlePress("0")}
            activeOpacity={0.7}
          >
            <Text style={styles.padText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.padButton} onPress={handleDelete}>
            <Ionicons name="backspace-outline" size={32} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    zIndex: 9999,
    elevation: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginVertical: 40,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dotError: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  errorContainer: {
    height: 30,
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  padContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 280,
    gap: 20,
    marginBottom: 60,
  },
  padButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  padButtonEmpty: {
    width: 80,
    height: 80,
  },
  padText: {
    fontSize: 32,
    color: Colors.text,
    fontWeight: '500',
  },
});
