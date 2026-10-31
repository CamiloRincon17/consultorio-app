import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useThemedStyles, type Palette } from '../theme';

interface EmptyStateProps {
  /** Nombre del ícono de Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Título principal del estado vacío */
  title: string;
  /** Subtítulo opcional con instrucción */
  subtitle?: string;
  /** Tamaño del ícono (default: 64) */
  iconSize?: number;
}

/**
 * Componente de estado vacío reutilizable.
 * Se usa cuando una lista no tiene elementos que mostrar.
 *
 * Uso:
 * ```tsx
 * <EmptyState
 *   icon="receipt-outline"
 *   title="Sin movimientos"
 *   subtitle="Registra tus ingresos y gastos"
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = React.memo(({
  icon,
  title,
  subtitle,
  iconSize = 64,
}) => {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={iconSize} color={colors.textSecondary} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
});

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
