import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from '../constants/Colors';

interface FormInputProps extends TextInputProps {
  /** Etiqueta visible encima del input */
  label: string;
  /** Texto de ayuda debajo del input (opcional) */
  helperText?: string;
}

/**
 * Campo de formulario reutilizable con etiqueta y texto de ayuda opcional.
 * Extiende todas las props de TextInput de React Native.
 *
 * Uso:
 * ```tsx
 * <FormInput
 *   label="Nombre Completo"
 *   placeholder="Ej. Juan Pérez"
 *   value={name}
 *   onChangeText={setName}
 *   autoFocus
 * />
 * ```
 */
export const FormInput: React.FC<FormInputProps> = ({ label, helperText, style, ...rest }) => {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, style]} placeholderTextColor={Colors.textSecondary} {...rest} />
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
