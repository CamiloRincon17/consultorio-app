import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useThemedStyles, type Palette } from '../theme';

interface StatCardProps {
  title: string;
  value: string | number;
  /** Nombre del ícono de Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Color del fondo del ícono */
  iconColor: string;
  /** Callback opcional al presionar la tarjeta */
  onPress?: () => void;
}

/**
 * Tarjeta de estadística para el Dashboard.
 * Muestra un ícono coloreado, un título y un valor resaltado.
 *
 * Uso:
 * ```tsx
 * <StatCard
 *   title="Pacientes"
 *   value={42}
 *   icon="people"
 *   iconColor={Colors.primary}
 *   onPress={() => router.push('/(tabs)/pacientes')}
 * />
 * ```
 */
export const StatCard: React.FC<StatCardProps> = React.memo(({
  title,
  value,
  icon,
  iconColor,
  onPress,
}) => {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {onPress ? (
        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

const createStyles = (colors: Palette) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  chevron: {
    marginLeft: 'auto',
  },
});
