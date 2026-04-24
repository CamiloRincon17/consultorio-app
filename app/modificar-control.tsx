import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Colors } from "../shared/constants/Colors";
import { useApp } from "../context/AppContext";
import { NotificationService } from "../services/NotificationService";
import { useDialog } from "../shared/context/DialogContext";

export default function ModifyControl() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { patients, updatePatient } = useApp();
  const dialog = useDialog();

  const patient = patients.find((p) => p.id === id);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [notificationScheduled, setNotificationScheduled] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    daysInAdvance: 1,
    notificationHour: 9,
    notificationMinute: 0,
  });
  const [treatmentType, setTreatmentType] = useState<"ortodoncia" | "general">(
    "general",
  );
  const [appointmentFrequency, setAppointmentFrequency] = useState<string>("4");

  const checkNotificationStatus = useCallback(async () => {
    const scheduled = await NotificationService.getAllScheduledNotifications();
    const hasNotification = scheduled.some(
      (n) => n.identifier === `appointment_${patient?.id}`,
    );
    setNotificationScheduled(hasNotification);
  }, [patient?.id]);

  const loadNotificationSettings = useCallback(async () => {
    try {
      const settings = await NotificationService.getSettings();
      setNotificationSettings({
        daysInAdvance: settings.daysInAdvance,
        notificationHour: settings.notificationHour,
        notificationMinute: settings.notificationMinute,
      });
    } catch (error) {
      console.error("Error loading notification settings:", error);
    }
  }, []);

  useEffect(() => {
    if (patient) {
      if (patient.nextControlDate) {
        setSelectedDate(new Date(patient.nextControlDate));
      } else {
        // Default to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setSelectedDate(tomorrow);
      }

      // Initialize treatment type and frequency
      setTreatmentType(patient.treatmentType || "general");
      setAppointmentFrequency(patient.appointmentFrequency?.toString() || "4");

      // Check if notification is already scheduled
      checkNotificationStatus();
      loadNotificationSettings();
    }
  }, [patient, checkNotificationStatus, loadNotificationSettings]);

  const handleDateChange = (event: any, date?: Date) => {
    // On Android, dismiss the picker first
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }

    // Check if user cancelled (event.type can be 'dismissed' or 'set')
    if (event.type === "dismissed") {
      // User cancelled, do nothing
      return;
    }

    // Update the date/time if provided
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleSave = async () => {
    if (!patient) return;

    // Validate date is in the future
    if (selectedDate <= new Date()) {
      dialog.alert(
        "Fecha inválida",
        "La fecha de la cita debe ser en el futuro.",
        "error"
      );
      return;
    }

    // Save to context with treatment info
    updatePatient(patient.id, {
      nextControlDate: selectedDate.toISOString(),
      treatmentType,
      appointmentFrequency: parseInt(appointmentFrequency, 10) || undefined,
    });

    // Schedule notification
    const success = await NotificationService.scheduleAppointmentNotification(
      patient.id,
      patient.name,
      selectedDate,
    );

    if (success) {
      dialog.alert(
        "Guardado",
        "Fecha actualizada y notificación programada correctamente.",
        "success",
        () => router.back()
      );
    } else {
      dialog.alert(
        "Parcialmente guardado",
        "La fecha se guardó pero no se pudo programar la notificación. Verifica permisos.",
        "error",
        () => router.back()
      );
    }
  };

  const handleCancelNotification = async () => {
    if (!patient) return;

    dialog.confirm(
      "¿Cancelar notificación?",
      "Se eliminará la notificación programada pero la fecha de cita se mantendrá.",
      async () => {
        await NotificationService.cancelAppointmentNotification(patient.id);
        setNotificationScheduled(false);
        dialog.alert("Cancelada", "Notificación cancelada", "success");
      },
      "danger"
    );
  };

  if (!patient) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Paciente no encontrado</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedDate = selectedDate.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = selectedDate.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="calendar" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Programar Cita</Text>
        <Text style={styles.subtitle}>{patient.name}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Fecha y Hora de la Cita</Text>

        {/* Date Selection */}
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            setShowDatePicker(true);
          }}
        >
          <View style={styles.dateButtonContent}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color={Colors.primary}
            />
            <View style={styles.dateTextContainer}>
              <Text style={styles.label}>Fecha</Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        <View style={styles.separator} />

        {/* Time Selection */}
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            setShowTimePicker(true);
          }}
        >
          <View style={styles.dateButtonContent}>
            <Ionicons name="time-outline" size={24} color={Colors.primary} />
            <View style={styles.dateTextContainer}>
              <Text style={styles.label}>Hora</Text>
              <Text style={styles.dateText}>{formattedTime}</Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
            minimumDate={new Date()}
            locale="es-ES"
          />
        )}

        {/* Time Picker */}
        {showTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
            locale="es-ES"
          />
        )}

        {/* Done Button for iOS */}
        {Platform.OS === "ios" && (showDatePicker || showTimePicker) && (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              setShowDatePicker(false);
              setShowTimePicker(false);
            }}
          >
            <Text style={styles.doneButtonText}>Listo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Treatment Type & Frequency Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tipo de Tratamiento</Text>

        <View style={styles.treatmentTypeContainer}>
          <TouchableOpacity
            style={[
              styles.treatmentTypeButton,
              treatmentType === "general" && styles.treatmentTypeButtonActive,
            ]}
            onPress={() => setTreatmentType("general")}
          >
            <Ionicons
              name="medkit-outline"
              size={24}
              color={
                treatmentType === "general"
                  ? Colors.primary
                  : Colors.textSecondary
              }
            />
            <Text
              style={[
                styles.treatmentTypeText,
                treatmentType === "general" && styles.treatmentTypeTextActive,
              ]}
            >
              General
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.treatmentTypeButton,
              treatmentType === "ortodoncia" &&
                styles.treatmentTypeButtonActive,
            ]}
            onPress={() => setTreatmentType("ortodoncia")}
          >
            <Ionicons
              name="happy-outline"
              size={24}
              color={
                treatmentType === "ortodoncia"
                  ? Colors.primary
                  : Colors.textSecondary
              }
            />
            <Text
              style={[
                styles.treatmentTypeText,
                treatmentType === "ortodoncia" &&
                  styles.treatmentTypeTextActive,
              ]}
            >
              Ortodoncia
            </Text>
          </TouchableOpacity>
        </View>

        {treatmentType === "ortodoncia" && (
          <View style={styles.frequencyContainer}>
            <Text style={styles.frequencyLabel}>
              Frecuencia de citas (semanas)
            </Text>
            <View style={styles.frequencyButtons}>
              {["2", "3", "4", "6", "8"].map((weeks) => (
                <TouchableOpacity
                  key={weeks}
                  style={[
                    styles.frequencyButton,
                    appointmentFrequency === weeks &&
                      styles.frequencyButtonActive,
                  ]}
                  onPress={() => setAppointmentFrequency(weeks)}
                >
                  <Text
                    style={[
                      styles.frequencyButtonText,
                      appointmentFrequency === weeks &&
                        styles.frequencyButtonTextActive,
                    ]}
                  >
                    {weeks}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.frequencyHint}>
              Se usará para reasignación automática
            </Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.notificationRow}>
          <Ionicons
            name={notificationScheduled ? "notifications" : "notifications-off"}
            size={24}
            color={
              notificationScheduled ? Colors.primary : Colors.textSecondary
            }
          />
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle}>
              {notificationScheduled
                ? "Notificación programada"
                : "Sin notificación"}
            </Text>
            <Text style={styles.notificationSubtitle}>
              Se enviará un recordatorio{" "}
              {notificationSettings.daysInAdvance === 1
                ? "el día anterior"
                : `${notificationSettings.daysInAdvance} días antes`}{" "}
              a la misma hora de la cita
            </Text>
          </View>
        </View>

        {notificationScheduled && (
          <TouchableOpacity
            style={styles.cancelNotificationButton}
            onPress={handleCancelNotification}
          >
            <Text style={styles.cancelNotificationText}>
              Cancelar notificación
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {patient.nextControlDate && (
        <TouchableOpacity
          style={styles.clearDateButton}
          onPress={() => {
            dialog.confirm(
              "Quitar Cita",
              '¿Estás seguro de quitar la cita actual? El paciente quedará "Sin Cita Agendada".',
              async () => {
                updatePatient(patient.id, { nextControlDate: undefined });
                await NotificationService.cancelAppointmentNotification(
                  patient.id,
                );
                router.back();
              },
              "danger"
            );
          }}
        >
          <Ionicons name="trash-outline" size={24} color={Colors.danger} />
          <Text style={styles.clearDateButtonText}>
            Quitar Cita (Marcar &quot;Sin Cita&quot;)
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Ionicons name="checkmark-circle" size={24} color="white" />
        <Text style={styles.saveButtonText}>Guardar y Notificar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
      >
        <Text style={styles.cancelButtonText}>Cancelar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary + "30",
  },
  dateButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dateTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    textTransform: "capitalize",
  },
  separator: {
    height: 1,
    backgroundColor: Colors.background,
    marginVertical: 8,
  },
  timeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  doneButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  notificationInfo: {
    marginLeft: 12,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  notificationSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  cancelNotificationButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.danger + "10",
    borderRadius: 8,
    alignItems: "center",
  },
  cancelNotificationText: {
    color: Colors.danger,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    gap: 8,
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelButton: {
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 18,
    color: Colors.danger,
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  clearDateButton: {
    backgroundColor: "#FFE5E5",
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  clearDateButtonText: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: "bold",
  },
  treatmentTypeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  treatmentTypeButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 8,
  },
  treatmentTypeButtonActive: {
    backgroundColor: Colors.primary + "10",
    borderColor: Colors.primary,
  },
  treatmentTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  treatmentTypeTextActive: {
    color: Colors.primary,
  },
  frequencyContainer: {
    marginTop: 16,
    gap: 12,
  },
  frequencyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  frequencyButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  frequencyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  frequencyButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  frequencyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  frequencyButtonTextActive: {
    color: "white",
  },
  frequencyHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
});
