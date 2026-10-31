import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSyncStore } from '../stores/syncStore';
import { getPendingCount } from '../../services/offlineQueue';
import { useColors, useThemedStyles, type Palette } from '../theme';

/**
 * Indicador compacto de sincronización.
 * Muestra: 🔄 Sincronizando... | ✅ Sincronizado hace X min | ⚠️ Sin sincronizar | 🟠 X pendientes
 */
export const SyncIndicator = React.memo(() => {
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const [pendingCount, setPendingCount] = useState(0);
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  // Cola offline: un solo intervalo estable (sin recrearlo en cada isSyncing)
  useEffect(() => {
    const check = () => getPendingCount().then(setPendingCount).catch(() => {});
    check();
    const interval = setInterval(check, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Al terminar una sincronización, re-contar pendientes de inmediato
  useEffect(() => {
    if (isSyncing) return;
    getPendingCount().then(setPendingCount).catch(() => {});
  }, [isSyncing]);

  if (isSyncing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.text}>Sincronizando...</Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.warning + '15' }]}>
        <View style={[styles.dot, { backgroundColor: colors.warning }]} />
        <Text style={[styles.text, { color: colors.warning }]}>
          {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
        </Text>
      </View>
    );
  }

  if (!lastSyncedAt) {
    return (
      <View style={styles.container}>
        <View style={[styles.dot, { backgroundColor: colors.warning }]} />
        <Text style={styles.text}>Sin sincronizar</Text>
      </View>
    );
  }

  const diffMs = Date.now() - lastSyncedAt.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const label =
    diffMin < 1
      ? 'Justo ahora'
      : diffMin < 60
        ? `Hace ${diffMin} min`
        : `Hace ${Math.floor(diffMin / 60)}h`;

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: colors.success }]} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
});

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  text: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

