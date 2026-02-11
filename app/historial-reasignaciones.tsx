import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";
import {
    AutoReassignService,
    ReassignmentHistoryEntry,
} from "../services/AutoReassignService";

export default function HistorialReasignaciones() {
  const router = useRouter();
  const [history, setHistory] = useState<ReassignmentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    const data = await AutoReassignService.getHistory();
    setHistory(data);
    setIsLoading(false);
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Confirmar",
      "¿Estás seguro de que quieres borrar todo el historial?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            await AutoReassignService.clearHistory();
            await loadHistory();
          },
        },
      ],
    );
  };

  const renderHistoryItem = ({ item }: { item: ReassignmentHistoryEntry }) => {
    const date = new Date(item.date);
    const isAutomatic = item.type === "automatic";

    return (
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <View style={styles.headerLeft}>
            <Ionicons
              name={isAutomatic ? "timer" : "hand-left"}
              size={24}
              color={isAutomatic ? Colors.primary : "#FF6B00"}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.historyTitle}>
                {isAutomatic
                  ? "Reasignación Automática"
                  : "Reasignación Manual"}
              </Text>
              <Text style={styles.historyDate}>
                {date.toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isAutomatic
                  ? Colors.primary + "20"
                  : "#FF6B0020",
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: isAutomatic ? Colors.primary : "#FF6B00" },
              ]}
            >
              {item.totalCount}{" "}
              {item.totalCount === 1 ? "paciente" : "pacientes"}
            </Text>
          </View>
        </View>

        {/* Lista de pacientes afectados */}
        <View style={styles.patientsContainer}>
          {item.patientsAffected.map((patient, index) => (
            <View key={patient.id} style={styles.patientItem}>
              <View style={styles.patientItemHeader}>
                <Ionicons
                  name="person"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.patientName}>{patient.name}</Text>
              </View>
              <View style={styles.dateChange}>
                {patient.previousDate ? (
                  <>
                    <Text style={styles.previousDate}>
                      {new Date(patient.previousDate).toLocaleDateString(
                        "es-ES",
                        {
                          day: "numeric",
                          month: "short",
                        },
                      )}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={Colors.textSecondary}
                    />
                  </>
                ) : (
                  <Text style={styles.previousDate}>Nueva cita</Text>
                )}
                <Text style={styles.newDate}>
                  {new Date(patient.newDate).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
                <Text style={styles.frequency}>({patient.frequency} sem.)</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Reasignaciones</Text>
        {history.length > 0 ? (
          <TouchableOpacity onPress={handleClearHistory}>
            <Ionicons name="trash-outline" size={24} color={Colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Cargando...</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="calendar-outline"
            size={64}
            color={Colors.textSecondary}
          />
          <Text style={styles.emptyText}>Sin historial</Text>
          <Text style={styles.emptySubtext}>
            Las reasignaciones automáticas y manuales aparecerán aquí
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
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
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  historyCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: "capitalize",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  patientsContainer: {
    gap: 8,
    marginTop: 4,
  },
  patientItem: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  patientItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  patientName: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  dateChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 22,
  },
  previousDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    textDecorationLine: "line-through",
  },
  newDate: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  frequency: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
