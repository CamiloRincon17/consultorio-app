import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../shared/constants/Colors";
import { Patient, useApp } from "../context/AppContext";
import { NotificationService } from "../services/NotificationService";
import { useDialog } from "../shared/context/DialogContext";

export default function ReasignarOrtodoncia() {
  const router = useRouter();
  const { patients, updatePatient } = useApp();
  const dialog = useDialog();
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(
    new Set(),
  );
  const [newDate, setNewDate] = useState<Date>(new Date());
  const [frequencyWeeks, setFrequencyWeeks] = useState<string>("4");
  const [selectAll, setSelectAll] = useState(false);

  // Filtrar solo pacientes de ortodoncia
  const ortodonciaPatients = patients.filter(
    (p) => p.treatmentType === "ortodoncia",
  );

  useEffect(() => {
    // Default: set date to next week
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setNewDate(nextWeek);
  }, []);

  const togglePatientSelection = (patientId: string) => {
    setSelectedPatients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(patientId)) {
        newSet.delete(patientId);
      } else {
        newSet.add(patientId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedPatients(new Set());
    } else {
      setSelectedPatients(new Set(ortodonciaPatients.map((p) => p.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleBatchReschedule = async () => {
    if (selectedPatients.size === 0) {
      dialog.alert("Error", "Selecciona al menos un paciente", "error");
      return;
    }

    const count = selectedPatients.size;
    const frequency = parseInt(frequencyWeeks, 10);

    dialog.confirm(
      "Confirmar Reasignación",
      `¿Reasignar ${count} cita(s) con frecuencia de ${frequency} semanas?`,
      async () => {
        let successCount = 0;

        for (const patientId of Array.from(selectedPatients)) {
          const patient = patients.find((p) => p.id === patientId);
          if (!patient) continue;

          // Calculate next appointment based on current date + frequency
          const nextAppointment = new Date(newDate);

          // Update patient
          updatePatient(patientId, {
            nextControlDate: nextAppointment.toISOString(),
            appointmentFrequency: frequency,
            lastAppointmentDate: new Date().toISOString(),
          });

          // Schedule notification
          await NotificationService.scheduleAppointmentNotification(
            patientId,
            patient.name,
            nextAppointment,
          );

          successCount++;
        }

        dialog.alert(
          "Completado",
          `Se reasignaron ${successCount} citas correctamente`,
          "success",
          () => router.back()
        );
      },
      "primary"
    );
  };

  const handleAutoReschedule = async (patient: Patient) => {
    if (!patient.appointmentFrequency) {
      dialog.custom(
        "Frecuencia no configurada",
        "Este paciente no tiene una frecuencia de citas configurada. ¿Deseas configurarla ahora?",
        "info",
        [
          {
            text: "Cada 2 sem",
            style: "primary",
            onPress: () => rescheduleWithFrequency(patient, 2),
          },
          {
            text: "Cada 4 sem",
            style: "primary",
            onPress: () => rescheduleWithFrequency(patient, 4),
          },
          {
            text: "Cada 6 sem",
            style: "primary",
            onPress: () => rescheduleWithFrequency(patient, 6),
          },
          {
            text: "Cancelar",
            style: "cancel",
            onPress: () => {},
          },
        ]
      );
      return;
    }

    rescheduleWithFrequency(patient, patient.appointmentFrequency);
  };

  const rescheduleWithFrequency = async (patient: Patient, weeks: number) => {
    const baseDate = patient.nextControlDate
      ? new Date(patient.nextControlDate)
      : new Date();

    // Advance by exactly 1 calendar month (same day, e.g. May 8 -> June 8)
    const nextAppointment = new Date(baseDate);
    nextAppointment.setMonth(nextAppointment.getMonth() + 1);

    updatePatient(patient.id, {
      nextControlDate: nextAppointment.toISOString(),
      appointmentFrequency: weeks,
      lastAppointmentDate: new Date().toISOString(),
    });

    await NotificationService.scheduleAppointmentNotification(
      patient.id,
      patient.name,
      nextAppointment,
    );

    dialog.alert(
      "Cita Reasignada",
      `Nueva cita: ${nextAppointment.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}`,
      "success"
    );
  };

  const incrementDate = (days: number) => {
    const newDateValue = new Date(newDate);
    newDateValue.setDate(newDateValue.getDate() + days);
    setNewDate(newDateValue);
  };

  const renderPatientItem = ({ item }: { item: Patient }) => {
    const isSelected = selectedPatients.has(item.id);
    const nextDate = item.nextControlDate
      ? new Date(item.nextControlDate)
      : null;

    return (
      <View style={styles.patientCard}>
        <TouchableOpacity
          style={styles.patientCardContent}
          onPress={() => togglePatientSelection(item.id)}
        >
          <View
            style={[styles.checkbox, isSelected && styles.checkboxSelected]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={18} color="white" />
            )}
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.name}</Text>
            <Text style={styles.patientDetail}>
              {nextDate
                ? `Próxima cita: ${nextDate.toLocaleDateString("es-ES")}`
                : "Sin cita programada"}
            </Text>
            {item.appointmentFrequency && (
              <Text style={styles.frequencyBadge}>
                Cada {item.appointmentFrequency} semanas
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.autoRescheduleButton}
          onPress={() => handleAutoReschedule(item)}
        >
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  if (ortodonciaPatients.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reasignar Citas</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.emptyState}>
          <Ionicons
            name="calendar-outline"
            size={64}
            color={Colors.textSecondary}
          />
          <Text style={styles.emptyText}>No hay pacientes de ortodoncia</Text>
          <Text style={styles.emptySubtext}>
            Marca pacientes como &quot;Ortodoncia&quot; en su perfil para usar
            esta función
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reasignar Ortodoncia</Text>
        <TouchableOpacity
          onPress={() => router.push("/historial-reasignaciones")}
        >
          <Ionicons name="time-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle"
            size={24}
            color={Colors.primary}
          />
          <Text style={styles.infoText}>
            Selecciona pacientes para reasignar sus citas en lote, o usa el
            botón ↻ para reasignar automáticamente basado en su frecuencia.
          </Text>
        </View>

        {/* Select All */}
        <View style={styles.selectAllCard}>
          <Text style={styles.selectAllText}>Seleccionar todos</Text>
          <Switch
            value={selectAll}
            onValueChange={toggleSelectAll}
            trackColor={{ false: "#ccc", true: Colors.primary + "80" }}
            thumbColor={selectAll ? Colors.primary : "#f4f3f4"}
          />
        </View>

        {/* Date Selector for Batch */}
        {selectedPatients.size > 0 && (
          <View style={styles.dateCard}>
            <Text style={styles.sectionTitle}>Nueva Fecha (en lote)</Text>

            <View style={styles.dateSelector}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => incrementDate(-7)}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={Colors.primary}
                />
              </TouchableOpacity>

              <Text style={styles.dateText}>
                {newDate.toLocaleDateString("es-ES", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </Text>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => incrementDate(7)}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.frequencyInput}>
              <Text style={styles.label}>Frecuencia (semanas):</Text>
              <TextInput
                style={styles.input}
                value={frequencyWeeks}
                onChangeText={setFrequencyWeeks}
                keyboardType="numeric"
                placeholder="4"
              />
            </View>
          </View>
        )}

        {/* Patient List */}
        <Text style={styles.sectionTitle}>
          Pacientes de Ortodoncia ({ortodonciaPatients.length})
        </Text>

        <FlatList
          data={ortodonciaPatients}
          renderItem={renderPatientItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContainer}
        />

        {/* Action Button */}
        {selectedPatients.size > 0 && (
          <TouchableOpacity
            style={styles.batchButton}
            onPress={handleBatchReschedule}
          >
            <Ionicons name="calendar-sharp" size={24} color="white" />
            <Text style={styles.batchButtonText}>
              Reasignar {selectedPatients.size} cita(s)
            </Text>
          </TouchableOpacity>
        )}
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
  content: {
    padding: 16,
    gap: 16,
  },
  infoCard: {
    backgroundColor: Colors.primary + "10",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  selectAllCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  dateCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 12,
  },
  dateButton: {
    padding: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    textTransform: "capitalize",
  },
  frequencyInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  listContainer: {
    gap: 12,
  },
  patientCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  patientCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  patientDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  frequencyBadge: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: "500",
  },
  autoRescheduleButton: {
    padding: 8,
    backgroundColor: Colors.primary + "10",
    borderRadius: 8,
  },
  batchButton: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  batchButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
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
