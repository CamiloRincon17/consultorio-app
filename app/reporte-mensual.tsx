import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../shared/constants/Colors";
import { useApp } from "../context/AppContext";
import { formatCOPShort } from "../shared/utils/formatCOP";

export default function MonthlyReportScreen() {
  const router = useRouter();
  const { transactions } = useApp();
  const [monthOffset, setMonthOffset] = useState(0);

  const report = useMemo(() => {
    const now = new Date();
    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth() + monthOffset,
      1,
    );

    const currentMonth = targetDate.getMonth();
    const currentYear = targetDate.getFullYear();

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0); // Last day of month

    const monthTransactions = transactions.filter((t) => {
      const tDate = new Date(t.date);
      return (
        tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth
      );
    });

    const income = monthTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    // Daily breakdown
    const daysInMonth = endOfMonth.getDate();
    const dailyStats = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = new Date(currentYear, currentMonth, day);

      const dayTransactions = monthTransactions.filter((t) => {
        const tDate = new Date(t.date);
        return tDate.getDate() === day;
      });

      const dayIncome = dayTransactions
        .filter((t) => t.type === "INCOME")
        .reduce((s, t) => s + t.amount, 0);
      const dayExpense = dayTransactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((s, t) => s + t.amount, 0);

      return {
        day,
        label: `${day}`,
        income: dayIncome,
        expense: dayExpense,
        date,
      };
    });

    return {
      date: startOfMonth,
      income,
      expenses,
      balance: income - expenses,
      transactions: monthTransactions,
      dailyStats,
    };
  }, [transactions, monthOffset]);

  const monthName = report.date.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Reporte Mensual</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Date Controls */}
        <View style={styles.dateControl}>
          <TouchableOpacity onPress={() => setMonthOffset((prev) => prev - 1)}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.dateRange}>
            <Text style={styles.rangeText}>
              {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setMonthOffset((prev) => prev + 1)}
            disabled={monthOffset >= 0}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={monthOffset >= 0 ? Colors.textSecondary : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Main Stats */}
        <View style={styles.statsCard}>
          <View style={styles.mainStat}>
            <Text style={styles.statLabel}>Balance Mensual</Text>
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
          <Text style={styles.sectionTitle}>Comportamiento Diario</Text>
          {report.dailyStats.length > 0 ? (
            <View>
              <LineChart
                data={{
                  labels: report.dailyStats.map((d) =>
                    d.day % 5 === 0 || d.day === 1 ? `${d.day}` : "",
                  ),
                  datasets: [
                    {
                      data:
                        report.dailyStats.length > 0
                          ? report.dailyStats.map((d) => d.income || 0)
                          : [0],
                      color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green with opacity
                      strokeWidth: 3,
                    },
                    {
                      data:
                        report.dailyStats.length > 0
                          ? report.dailyStats.map((d) => d.expense || 0)
                          : [0],
                      color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`, // Red with opacity
                      strokeWidth: 3,
                    },
                  ],
                }}
                width={Dimensions.get("window").width - 40}
                height={240}
                yAxisLabel="$"
                yAxisSuffix=""
                yAxisInterval={1}
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#f8f9fa",
                  backgroundGradientFromOpacity: 1,
                  backgroundGradientTo: "#ffffff",
                  backgroundGradientToOpacity: 1,
                  decimalPlaces: 0,
                  color: (opacity = 1) =>
                    `rgba(100, 100, 100, ${opacity * 0.3})`,
                  labelColor: (opacity = 1) => `rgba(80, 80, 80, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: "#fff",
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: "", // solid background lines
                    stroke: "#e0e0e0",
                    strokeWidth: 1,
                  },
                  propsForLabels: {
                    fontSize: 10,
                  },
                }}
                bezier
                style={{
                  marginVertical: 12,
                  borderRadius: 16,
                  paddingRight: 0,
                  paddingLeft: 8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
              />
              {/* Custom Legend */}
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: "rgba(76, 175, 80, 1)" },
                    ]}
                  />
                  <Text style={styles.legendText}>Ingresos</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: "rgba(244, 67, 54, 1)" },
                    ]}
                  />
                  <Text style={styles.legendText}>Gastos</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyChartContainer}>
              <Text style={styles.emptyText}>No hay datos para este mes</Text>
            </View>
          )}
        </View>

        {/* Transaction List Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Movimientos ({report.transactions.length})
          </Text>
          {report.transactions.length === 0 ? (
            <Text style={styles.emptyText}>No hubo movimientos este mes.</Text>
          ) : (
            report.transactions
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              )
              .map((t) => (
                <View key={t.id} style={styles.transactionRow}>
                  <View>
                    <Text style={styles.transDesc}>{t.description}</Text>
                    <Text style={styles.transDate}>
                      {new Date(t.date).toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "numeric",
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
  emptyChartContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 24,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
});
