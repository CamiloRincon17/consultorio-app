import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../../shared/constants/Colors";
import { formatCOPShort } from "../../../shared/utils/formatCOP";
import { Transaction } from "../types";
import { Patient } from "../../patients/types";

export const getDisplayName = (item: Transaction, patients: Patient[]) => {
  if (item.type === "EXPENSE") return item.procedure;
  if (item.patientName) return item.patientName;
  if (item.patientId) {
    const patient = patients.find((p) => p.id === item.patientId);
    if (patient) return patient.name;
  }
  return item.procedure;
};

interface TransactionCardProps {
  item: Transaction;
  patients: Patient[];
  onPress: () => void;
}

export const TransactionCard = ({
  item,
  patients,
  onPress,
}: TransactionCardProps) => {
  const displayName = getDisplayName(item, patients);
  const subTitle = displayName !== item.procedure ? item.procedure : "";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor:
              item.type === "INCOME"
                ? Colors.success + "20"
                : Colors.danger + "20",
          },
        ]}
      >
        <Ionicons
          name={item.type === "INCOME" ? "arrow-up" : "arrow-down"}
          size={24}
          color={item.type === "INCOME" ? Colors.success : Colors.danger}
        />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.description}>{displayName}</Text>
        {subTitle ? <Text style={styles.subtitle}>{subTitle}</Text> : null}
        <Text style={styles.date}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          { color: item.type === "INCOME" ? Colors.success : Colors.danger },
        ]}
      >
        {item.type === "INCOME" ? "+" : "-"}
        {formatCOPShort(item.amount)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
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
  description: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
  },
  date: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
