import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useCallback } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../shared/constants/Colors";
import { usePatientsStore } from "../../features/patients/store";
import { useFinanceStore } from "../../features/finance/store";
import { useAuthStore } from "../../features/auth/store";
import { useSyncStore } from "../../shared/stores/syncStore";
import { computeDashboardStats } from "../../features/finance/financeCalculations";
import { formatCOPShort } from "../../shared/utils/formatCOP";
import { AvatarInitials } from "../../shared/components/AvatarInitials";
import { SyncIndicator } from "../../shared/components/SyncIndicator";
import { DashboardSkeleton } from "../../shared/components/SkeletonLoader";

export default function Dashboard() {
  const router = useRouter();
  const patients = usePatientsStore((s) => s.patients);
  const isLoading = usePatientsStore((s) => s.isLoading);
  const transactions = useFinanceStore((s) => s.transactions);
  const userEmail = useAuthStore((s) => s.user?.email ?? "");
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const refetch = useSyncStore((s) => s.refetch);
  const isSyncing = useSyncStore((s) => s.isSyncing);

  const stats = useMemo(() => computeDashboardStats(transactions), [transactions]);

  const activePatients = patients.length;
  const isFromCache = usePatientsStore((s) => s.isFromCache);

  // Pacientes pendientes de sincronizar
  const pendingSyncPatients = useMemo(() => 
    patients.filter((p) => p._syncStatus === "pending"),
    [patients]
  );

  // Citas pendientes (hoy o futuro)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcomingAppointments = patients.filter((p) => {
    if (!p.nextControlDate) return false;
    return new Date(p.nextControlDate) >= todayStart;
  });
  const pendingAppointments = upcomingAppointments.length;

  // Balance neto del mes
  const monthlyBalance = useMemo(() => {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const income = monthTx
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + t.amount, 0);
    const expenses = monthTx
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + t.amount, 0);
    return { income, expenses, net: income - expenses };
  }, [transactions]);

  // Pacientes de ortodoncia que no han pagado este mes
  const debtors = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    return patients
      .filter((p) => p.treatmentType === "ortodoncia" && (p.monthlyFee ?? 0) > 0)
      .filter((p) => {
        // Buscar si tiene un pago (INCOME) este mes
        const hasPaidThisMonth = transactions.some(
          (t) =>
            t.patientId === p.id &&
            t.type === "INCOME" &&
            new Date(t.date).getMonth() === currentMonth &&
            new Date(t.date).getFullYear() === currentYear
        );
        return !hasPaidThisMonth;
      });
  }, [patients, transactions]);

  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    try {
      await refetch(userId);
    } catch {
      // Error handled in syncStore
    }
  }, [userId, refetch]);

  // Nombre corto del doctor
  const doctorName = userEmail.split("@")[0].replace(/[._-]/g, " ");
  const capitalizedName = doctorName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const Card = ({ title, value, icon, color, onPress }: any) => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Resumen</Text>
            <Text style={styles.headerSubtitle}>Cargando datos...</Text>
          </View>
        </View>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Resumen </Text>
          <Text style={styles.headerSubtitle}>
            Hola, {capitalizedName}
          </Text>
          <Text style={styles.headerSubtitle}>
            Dios te bendiga
          </Text>
        </View>
        <SyncIndicator />
        <TouchableOpacity
          onPress={() => router.push("/configuracion")}
          style={{ marginLeft: 12 }}
        >
          <Ionicons name="settings-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isSyncing} onRefresh={handleRefresh} />
        }
      >
        {/* ── Balance del Mes ── */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Balance del Mes</Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: monthlyBalance.net >= 0 ? Colors.success : Colors.danger },
            ]}
          >
            {formatCOPShort(monthlyBalance.net)}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Ionicons name="arrow-up-circle" size={16} color={Colors.success} />
              <Text style={styles.balanceLabel}>Ingresos</Text>
              <Text style={[styles.balanceValue, { color: Colors.success }]}>
                {formatCOPShort(monthlyBalance.income)}
              </Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Ionicons name="arrow-down-circle" size={16} color={Colors.danger} />
              <Text style={styles.balanceLabel}>Gastos</Text>
              <Text style={[styles.balanceValue, { color: Colors.danger }]}>
                {formatCOPShort(monthlyBalance.expenses)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stats Cards ── */}
        <View style={styles.statsContainer}>
          <Card
            title="Pacientes"
            value={activePatients}
            icon="people"
            color={Colors.primary}
            onPress={() => router.push("/(tabs)/pacientes")}
          />
          <Card
            title="Ingresos Mensual"
            value={formatCOPShort(stats.monthlyIncome)}
            icon="cash"
            color={Colors.success}
            onPress={() => router.push("/reporte-mensual")}
          />
          <Card
            title="Reporte Semanal"
            value={formatCOPShort(stats.weeklyIncome)}
            icon="trending-up"
            color="#8B5CF6"
            onPress={() => router.push("/reporte-semanal")}
          />
          <Card
            title="Próx. Citas"
            value={pendingAppointments}
            icon="calendar"
            color={Colors.warning}
            onPress={() => router.push("/(tabs)/agenda")}
          />
        </View>

        {/* ── Pacientes Pendientes de Subir ── */}
        {pendingSyncPatients.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cloud-offline-outline" size={18} color={Colors.warning} />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Pendientes de Subir</Text>
              <Text style={styles.sectionBadge}>{pendingSyncPatients.length}</Text>
            </View>
            <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 12 }}>
              Estos pacientes se subirán cuando haya conexión
            </Text>
            {pendingSyncPatients.slice(0, 3).map((p) => (
              <View key={p.id} style={styles.debtorCard}>
                <AvatarInitials name={p.name} size={36} />
                <View style={styles.debtorContent}>
                  <Text style={styles.debtorName}>{p.name}</Text>
                  <Text style={styles.debtorSub}>
                    {p.treatmentType === 'ortodoncia' ? 'Ortodoncia' : 'General'}
                  </Text>
                </View>
                <View style={styles.debtorBadge}>
                  <Text style={styles.debtorBadgeText}>📱 Local</Text>
                </View>
              </View>
            ))}
            {pendingSyncPatients.length > 3 && (
              <TouchableOpacity
                style={{ alignItems: 'center', paddingVertical: 8 }}
                onPress={() => router.push("/(tabs)/pacientes")}
              >
                <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 14 }}>
                  Ver todos ({pendingSyncPatients.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/registrar-pago")}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.success }]}>
              <Ionicons name="card-outline" size={24} color="white" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Registrar Pago</Text>
              <Text style={styles.actionSubtitle}>Cobrar mensualidad a paciente</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/registrar-paciente")}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.primary }]}>
              <Ionicons name="person-add-outline" size={24} color="white" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Nuevo Paciente</Text>
              <Text style={styles.actionSubtitle}>Registrar historial y cuota</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  // ── Balance Card ──
  balanceCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    alignItems: "center",
  },
  balanceTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
  },
  balanceItem: {
    alignItems: "center",
    gap: 4,
  },
  balanceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  balanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  // ── Stats ──
  statsContainer: {
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
  },
  // ── Sections ──
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  sectionBadge: {
    backgroundColor: Colors.danger,
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
  },
  // ── Debtors ──
  debtorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  debtorContent: {
    flex: 1,
    marginLeft: 12,
  },
  debtorName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  debtorSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  debtorBadge: {
    backgroundColor: Colors.warning + "18",
    borderWidth: 1,
    borderColor: Colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  debtorBadgeText: {
    color: Colors.warning,
    fontSize: 13,
    fontWeight: "700",
  },
  // ── Actions ──
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  actionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
