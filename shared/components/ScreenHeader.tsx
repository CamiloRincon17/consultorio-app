import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles, type Palette } from '../theme';

interface ScreenHeaderProps {
  title: string;
  /** Texto del botón de acción (opcional) */
  actionLabel?: string;
  /** Nombre del ícono para el botón de acción */
  actionIcon?: keyof typeof Ionicons.glyphMap;
  /** Callback al presionar el botón de acción */
  onAction?: () => void;
  /** Elemento adicional en el lado derecho (alternatva a action) */
  rightElement?: React.ReactNode;
}

/**
 * Header reutilizable para todas las pantallas.
 * Muestra un título grande y opcionalmente un botón de acción a la derecha.
 *
 * Uso:
 * ```tsx
 * <ScreenHeader
 *   title="Pacientes"
 *   actionLabel="Nuevo"
 *   actionIcon="add"
 *   onAction={() => router.push('/registrar-paciente')}
 * />
 * ```
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  actionLabel,
  actionIcon = 'add',
  onAction,
  rightElement,
}) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {rightElement ?? (
        onAction && actionLabel ? (
          <TouchableOpacity style={styles.actionButton} onPress={onAction}>
            <Ionicons name={actionIcon} size={24} color="white" />
            <Text style={styles.actionButtonText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null
      )}
    </View>
  );
};

const createStyles = (colors: Palette) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  actionButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 4,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
