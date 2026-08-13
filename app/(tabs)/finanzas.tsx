import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../shared/constants/Colors";
import { Transaction } from "../../features/finance/types";
import { useFinanceStore } from "../../features/finance/store";
import { usePatientsStore } from "../../features/patients/store";
import { useAuthStore } from "../../features/auth/store";
import { useSyncStore } from "../../shared/stores/syncStore";
import { formatCOPShort } from "../../shared/utils/formatCOP";
import { TransactionCard } from "../../features/finance/components/TransactionCard";
import { FinanceSkeleton } from "../../shared/components/SkeletonLoader";

export default function FinanceScreen() {
  const router = useRouter();
  const transactions = useFinanceStore((s) => s.transactions);
  const isLoading = useFinanceStore((s) => s.isLoading);
  const getFinancialSummary = useFinanceStore((s) => s.getFinancialSummary);
  const patients = usePatientsStore((s) => s.patients);
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const refetch = useSyncStore((s) => s.refetch);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const summary = getFinancialSummary();

  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    try { await refetch(userId); } catch {}
  }, [userId, refetch]);

  const monthlyStats = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter transactions for current month
    const currentMonthTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = currentMonthTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = currentMonthTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    // Prepare chart data (Daily for current month)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayTrans = currentMonthTransactions.filter(
        (t) => new Date(t.date).getDate() === day,
      );
      const dayIncome = dayTrans
        .filter((t) => t.type === "INCOME")
        .reduce((s, t) => s + t.amount, 0);
      const dayExpense = dayTrans
        .filter((t) => t.type === "EXPENSE")
        .reduce((s, t) => s + t.amount, 0);
      return { day, income: dayIncome, expense: dayExpense };
    });

    return { income, expenses, dailyData };
  }, [transactions]);

  const sections = React.useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const groups: { [key: string]: Transaction[] } = {};
    const sectionOrder: string[] = [];

    sorted.forEach((t) => {
      const d = new Date(t.date);
      const title = d.toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      });
      const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

      if (!groups[capitalizedTitle]) {
        groups[capitalizedTitle] = [];
        sectionOrder.push(capitalizedTitle);
      }
      groups[capitalizedTitle].push(t);
    });

    return sectionOrder.map((title) => ({
      title,
      data: groups[title],
    }));
  }, [transactions]);

  const renderItem = ({ item }: { item: Transaction }) => {
    return (
      <TransactionCard
        item={item}
        patients={patients}
        onPress={() =>
          router.push({
            pathname: "/editar-transaccion",
            params: { id: item.id },
          })
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Finanzas</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/registrar-transaccion")}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>Nueva</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.balanceContainer}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Ingreso Mensual</Text>
          <Text style={[styles.balanceValue, { color: Colors.success }]}>
            {formatCOPShort(monthlyStats.income)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Gasto Mes</Text>
          <Text style={[styles.balanceValue, { color: Colors.danger }]}>
            {formatCOPShort(monthlyStats.expenses)}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1 }}>
          <FinanceSkeleton />
        </View>
      ) : (
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isSyncing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            {transactions.length > 0 ? "Historial de movimientos" : ""}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="receipt-outline"
              size={64}
              color={Colors.textSecondary}
            />
            <Text style={styles.emptyText}>Sin movimientos</Text>
            <Text style={styles.emptySubtext}>
              Registra tus ingresos y gastos
            </Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
      />
      )}
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
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text,
  },
  linkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: Colors.background,
  },
  addButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
  balanceContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: "space-around",
    alignItems: "center",
  },
  balanceItem: {
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  divider: {
    width: 1,
    height: "80%",
    backgroundColor: Colors.border,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  chartSection: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  chartScroll: {
    paddingBottom: 8,
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 100,
    gap: 8,
  },
  chartCol: {
    alignItems: "center",
    width: 20,
  },
  barsArea: {
    height: 80,
    width: "100%",
    justifyContent: "flex-end",
    backgroundColor: "#F5F5F5",
    borderRadius: 4,
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderRadius: 2,
  },
  dayLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
