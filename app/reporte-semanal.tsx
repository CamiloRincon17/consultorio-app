import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../shared/constants/Colors";
import { useApp } from "../context/AppContext";
import { formatCOPShort } from "../shared/utils/formatCOP";

export default function WeeklyReportScreen() {
  const router = useRouter();
  const { transactions } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);

  const report = useMemo(() => {
    const now = new Date();
    // Calculate start of the current week (Monday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    // Apply offset
    startOfWeek.setDate(startOfWeek.getDate() + weekOffset * 7);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekTransactions = transactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate >= startOfWeek && tDate <= endOfWeek;
    });

    const income = weekTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = weekTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    // Daily breakdown
    const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const dailyStats = days.map((label, index) => {
      // Calculate date for this day of the week
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + index);

      const dayTransactions = weekTransactions.filter((t) => {
        const tDate = new Date(t.date);
        return (
          tDate.getDate() === d.getDate() && tDate.getMonth() === d.getMonth()
        );
      });

      const dayIncome = dayTransactions
        .filter((t) => t.type === "INCOME")
        .reduce((s, t) => s + t.amount, 0);
      const dayExpense = dayTransactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((s, t) => s + t.amount, 0);

      return { label, income: dayIncome, expense: dayExpense, date: d };
    });

    return {
      start: startOfWeek,
      end: endOfWeek,
      income,
      expenses,
      balance: income - expenses,
      transactions: weekTransactions,
      dailyStats,
    };
  }, [transactions, weekOffset]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Reporte Semanal</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Date Controls */}
        <View style={styles.dateControl}>
          <TouchableOpacity onPress={() => setWeekOffset((prev) => prev - 1)}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.dateRange}>
            <Text style={styles.rangeText}>
              {report.start.toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
              })}{" "}
              -{" "}
              {report.end.toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
              })}
            </Text>
            <Text style={styles.yearText}>{report.start.getFullYear()}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setWeekOffset((prev) => prev + 1)}
            disabled={weekOffset >= 0}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={weekOffset >= 0 ? Colors.textSecondary : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Main Stats */}
        <View style={styles.statsCard}>
          <View style={styles.mainStat}>
            <Text style={styles.statLabel}>Balance</Text>
            <Text
              style={[
                styles.balanceValue,
                { color: report.balance >= 0 ? Colors.success : Colors.danger },
              ]}
            >
              {report.balance >= 0 ? "+" : ""}
              {formatCOPShort(report.balance)}
            </Text>
          </View>
          <View style={styles.secondaryStats}>
            <View style={styles.statItem}>
              <View style={[styles.dot, { backgroundColor: Colors.success }]} />
              <Text style={styles.subStatLabel}>Ingresos</Text>
              <Text style={styles.subStatValue}>
                {formatCOPShort(report.income)}
              </Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
              <Text style={styles.subStatLabel}>Gastos</Text>
              <Text style={styles.subStatValue}>
                {formatCOPShort(report.expenses)}
              </Text>
            </View>
          </View>
        </View>

        {/* Daily Chart (Visual) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen Diario</Text>
          <View style={styles.chartContainer}>
            {report.dailyStats.map((day, index) => {
              const maxVal = Math.max(
                ...report.dailyStats.map((d) => Math.max(d.income, d.expense)),
                1,
              );
              const incomeHeight = (day.income / maxVal) * 100;
              const expenseHeight = (day.expense / maxVal) * 100;

              return (
                <View key={index} style={styles.chartCol}>
                  <View style={styles.barsArea}>
                    {day.income > 0 && (
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${incomeHeight}%`,
                            backgroundColor: Colors.success,
                          },
                        ]}
                      />
                    )}
                    {day.expense > 0 && (
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${expenseHeight}%`,
                            backgroundColor: Colors.danger,
                            position: "absolute",
                            bottom: 0,
                            width: 4,
                            right: 0,
                          },
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.dayLabel,
                      day.date.toDateString() === new Date().toDateString() &&
                        styles.todayLabel,
                    ]}
                  >
                    {day.label.charAt(0)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Transaction List Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Movimientos ({report.transactions.length})
          </Text>
          {report.transactions.length === 0 ? (
            <Text style={styles.emptyText}>
              No hubo movimientos esta semana.
            </Text>
          ) : (
            report.transactions.map((t) => (
              <View key={t.id} style={styles.transactionRow}>
                <View>
                  <Text style={styles.transDesc}>{t.description}</Text>
                  <Text style={styles.transDate}>
                    {new Date(t.date).toLocaleDateString("es-ES", {
                      weekday: "long",
                    })}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transAmount,
                    {
                      color:
                        t.type === "INCOME" ? Colors.success : Colors.danger,
                    },
                  ]}
                >
                  {t.type === "INCOME" ? "+" : "-"}
                  {formatCOPShort(t.amount)}
                </Text>
              </View>
            ))
          )}
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
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  content: {
    padding: 16,
  },
  dateControl: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateRange: {
    alignItems: "center",
  },
  rangeText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  yearText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statsCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mainStat: {
    alignItems: "center",
    marginBottom: 20,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "bold",
  },
  secondaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  subStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  subStatValue: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  verticalDivider: {
    width: 1,
    height: "100%",
    backgroundColor: Colors.border,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 150,
    alignItems: "flex-end",
    paddingHorizontal: 8,
  },
  chartCol: {
    alignItems: "center",
    flex: 1,
  },
  barsArea: {
    height: 120,
    width: 20,
    justifyContent: "flex-end",
    position: "relative",
    marginBottom: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  todayLabel: {
    fontWeight: "bold",
    color: Colors.primary,
  },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  transDesc: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  transDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: "capitalize",
  },
  transAmount: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: Colors.textSecondary,
    fontStyle: "italic",
    marginTop: 12,
  },
});
