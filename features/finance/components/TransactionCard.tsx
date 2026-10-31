import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors, useThemedStyles, type Palette } from "../../../shared/theme";
import { formatCOPShort } from "../../../shared/utils/formatCOP";
import { Transaction } from "../types";
import { Patient } from "../../patients/types";

// Color especial para arriendos de consultorio
const RENTAL_COLOR = "#F59E0B"; // Ámbar/dorado

export const getDisplayName = (item: Transaction, patients: Patient[]) => {
  if (item.type === "EXPENSE") return item.procedure || item.description || "Gasto";
  if (item.patientName) return item.patientName;
  if (item.patientId) {
    const patient = patients.find((p) => p.id === item.patientId);
    if (patient) return patient.name;
  }
  return item.procedure || item.description || (item.category === "arriendo_consultorio" ? "Alquiler Consultorio" : "Ingreso");
};

/** Devuelve el color correcto para la transacción según su categoría y tipo */
function getTransactionColor(item: Transaction, colors: Palette): string {
  if (item.category === "arriendo_consultorio") return RENTAL_COLOR;
  return item.type === "INCOME" ? colors.success : colors.danger;
}

/** Devuelve el ícono correcto */
function getTransactionIcon(item: Transaction): "home-outline" | "arrow-up" | "arrow-down" {
  if (item.category === "arriendo_consultorio") return "home-outline";
  return item.type === "INCOME" ? "arrow-up" : "arrow-down";
}

interface TransactionCardProps {
  item: Transaction;
  patients: Patient[];
  onPress: () => void;
}

export const TransactionCard = React.memo(({
  item,
  patients,
  onPress,
}: TransactionCardProps) => {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const displayName = getDisplayName(item, patients);
  const subTitle = (item.procedure && displayName !== item.procedure) ? item.procedure : (item.description && displayName !== item.description ? item.description : "");
  const color = getTransactionColor(item, colors);
  const icon = getTransactionIcon(item);
  const isRental = item.category === "arriendo_consultorio";

  return (
    <TouchableOpacity
      style={[styles.card, isRental && styles.cardRental]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.description}>{displayName}</Text>
          {isRental && (
            <View style={styles.rentalBadge}>
              <Text style={styles.rentalBadgeText}>Consultorio</Text>
            </View>
          )}
        </View>
        {subTitle ? <Text style={styles.subtitle}>{subTitle}</Text> : null}
        <Text style={styles.date}>
          {new Date(item.date).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Text>
      </View>
      <Text style={[styles.amount, { color }]}>
        {item.type === "INCOME" ? "+" : "-"}
        {formatCOPShort(item.amount)}
      </Text>
    </TouchableOpacity>
  );
});

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
  },
  cardRental: {
    borderLeftWidth: 3,
    borderLeftColor: RENTAL_COLOR,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  description: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
  },
  rentalBadge: {
    backgroundColor: RENTAL_COLOR + "20",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  rentalBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: RENTAL_COLOR,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
