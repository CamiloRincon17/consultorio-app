import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors, useThemedStyles, type Palette } from "../../shared/theme";
import { useAuthStore } from "../../features/auth/store";
import { useSyncStore } from "../../shared/stores/syncStore";
import { usePatientsStore } from "../../features/patients/store";
import { useFinanceStore } from "../../features/finance/store";
import { useSpecialistStore } from "../../features/specialists/store";
import { useDialog } from "../../shared/context/DialogContext";

export default function ConfigSync() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const userId = useAuthStore((s) => s.session?.user?.id || "");
  const dialog = useDialog();
  const refetch = useSyncStore((s) => s.refetch);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const patients = usePatientsStore((s) => s.patients);
  const transactions = useFinanceStore((s) => s.transactions);
  const specialistBlocks = useSpecialistStore((s) => s.specialistBlocks);
  const savedDoctors = useSpecialistStore((s) => s.savedDoctors);

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const pendingPatients = patients.filter(
    (p) => p._syncStatus === "pending"
  ).length;
  const pendingTransactions = transactions.filter(
    (t) => t._syncStatus === "pending"
  ).length;
  const pendingBlocks = specialistBlocks.filter(
    (b) => b._syncStatus === "pending"
  ).length;
  const pendingDoctors = savedDoctors.filter(
    (d) => d._syncStatus === "pending"
  ).length;
  const pendingTotal = pendingPatients + pendingTransactions + pendingBlocks + pendingDoctors;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  const handleSync = async () => {
    if (!userId) {
      dialog.alert("Sin sesión", "No hay sesión activa para sincronizar", "error");
      return;
    }
    try {
      setIsSyncingNow(true);
      await refetch(userId);
      dialog.alert(
        "Sincronización completada",
        "Los datos se sincronizaron correctamente",
        "success"
      );
    } catch (error: any) {
      const msg = error?.message || "Error desconocido";
      console.error("Error en sync:", error);
      dialog.alert("Error al sincronizar", msg, "error");
    } finally {
      setIsSyncingNow(false);
    }
  };

  const formatLastSynced = () => {
    if (!lastSyncedAt) return "Nunca";
    return lastSyncedAt.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const syncing = isSyncing || isSyncingNow;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado de conexión</Text>
        <View style={styles.item}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: (isConnected ? colors.success : colors.danger) + "20" },
            ]}
          >
            <Ionicons
              name={isConnected ? "wifi-outline" : "cloud-offline-outline"}
              size={24}
              color={isConnected ? colors.success : colors.danger}
            />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>
              {isConnected === null ? "Verificando..." : isConnected ? "Conectado" : "Sin conexión"}
            </Text>
            <Text style={styles.itemSubtitle}>
              {isConnected
                ? "Se sincronizará automáticamente al reconectar"
                : "Los cambios se guardan localmente y se subirán al reconectar"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sincronización</Text>
        <View style={styles.item}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
            <Ionicons name="time-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Última sincronización</Text>
            <Text style={styles.itemSubtitle}>{formatLastSynced()}</Text>
          </View>
        </View>

        <View style={styles.separator} />
        <TouchableOpacity
          style={[styles.item, syncing && styles.itemDisabled]}
          onPress={handleSync}
          disabled={syncing}
        >
          <View style={[styles.iconContainer, { backgroundColor: "#0EA5E9" + "20" }]}>
            {syncing ? (
              <ActivityIndicator size="small" color="#0EA5E9" />
            ) : (
              <Ionicons name="sync-outline" size={24} color="#0EA5E9" />
            )}
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>
              {syncing ? "Sincronizando..." : "Sincronizar ahora"}
            </Text>
            <Text style={styles.itemSubtitle}>
              Fuerza una descarga y subida de datos
            </Text>
          </View>
          {!syncing && (
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos pendientes</Text>
        <View style={styles.item}>
          <View style={[styles.iconContainer, { backgroundColor: "#F59E0B" + "20" }]}>
            <Ionicons name="cloud-upload-outline" size={24} color="#F59E0B" />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Cambios por subir</Text>
            <Text style={styles.itemSubtitle}>
              {pendingTotal === 0
                ? "Todo sincronizado"
                : `${pendingTotal} elemento${pendingTotal !== 1 ? "s" : ""} pendiente${pendingTotal !== 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>
        {pendingTotal > 0 && (
          <>
            <View style={styles.separator} />
            <View style={{ paddingHorizontal: 4, gap: 4 }}>
              <Text style={styles.pendingLine}>Pacientes: {pendingPatients}</Text>
              <Text style={styles.pendingLine}>Transacciones: {pendingTransactions}</Text>
              <Text style={styles.pendingLine}>Bloques especialistas: {pendingBlocks}</Text>
              <Text style={styles.pendingLine}>Doctores guardados: {pendingDoctors}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notas</Text>
        <Text style={styles.infoText}>
          • Al perder la conexión, las operaciones se guardan localmente.
        </Text>
        <Text style={styles.infoText}>
          • Al volver a tener internet, la app intenta sincronizar automáticamente.
        </Text>
        <Text style={styles.infoText}>
          • Usa &quot;Sincronizar ahora&quot; para forzar una actualización manual.
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 24 },
    section: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 16,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
    },
    itemDisabled: { opacity: 0.6 },
    separator: {
      height: 1,
      backgroundColor: colors.background,
      marginVertical: 8,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    itemContent: { flex: 1 },
    itemTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    itemSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    pendingLine: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    infoText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 6,
      lineHeight: 20,
    },
  });
