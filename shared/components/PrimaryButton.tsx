import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useColors } from '../theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  /** Si true muestra un spinner y deshabilita el botón */
  loading?: boolean;
  /** Variante de color: 'primary' | 'danger' | 'success' */
  variant?: 'primary' | 'danger' | 'success';
  style?: ViewStyle;
}

/**
 * Botón de acción principal reutilizable con soporte para estado de carga.
 *
 * Uso:
 * ```tsx
 * <PrimaryButton
 *   label="Guardar Paciente"
 *   onPress={handleSave}
 *   loading={isSaving}
 * />
 * <PrimaryButton
 *   label="Eliminar"
 *   onPress={handleDelete}
 *   variant="danger"
 * />
 * ```
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  loading = false,
  variant = 'primary',
  style,
}) => {
  const colors = useColors();
  const backgroundColor = {
    primary: colors.primary,
    danger: colors.danger,
    success: colors.success,
  }[variant];

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }, style]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  text: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
