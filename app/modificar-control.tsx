import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useColors, useThemedStyles, type Palette } from "../shared/theme";
import { usePatientsStore } from "../features/patients/store";
import { NotificationService } from "../services/NotificationService";
import { useDialog } from "../shared/context/DialogContext";
import { useSpecialistStore } from "../features/specialists/store";
import { findSpecialistConflictForAppointment } from "../shared/utils/scheduleUtils";

const REASON_SUGGESTIONS = [
  "Control",
  "Ajuste de brackets",
  "Limpieza",
  "Calza / Resina",
  "Revisión",
  "Extracción",
  "Urgencia",
];

export default function ModifyControl() {
  const router = useRouter();
  const { id, date, appointmentId } = useLocalSearchParams();
  
  const patients = usePatientsStore((s) => s.patients);
  const addAppointment = usePatientsStore((s) => s.addAppointment);
  const updateAppointment = usePatientsStore((s) => s.updateAppointment);
  const deleteAppointment = usePatientsStore((s) => s.deleteAppointment);
  const updatePatient = usePatientsStore((s) => s.updatePatient);

  const dialog = useDialog();
  const patient = patients.find((l) => l.id === id);
  const specialistBlocks = useSpecialistStore((s) => s.specialistBlocks);
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  // Buscar cita a editar inicial (si se lasó appointmentId)
  const initialEditingAppointment =
    appointmentId && patient?.appointments
      ? patient.appointments.find((a) => a.id === appointmentId)
      : null;

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initialEditingAppointment) {
      return new Date(initialEditingAppointment.date);
    }
    if (date) {
      return new Date((date as string) + "T10:00:00Z");
    }
    if (patient?.nextControlDate) {
      return new Date(patient.nextControlDate);
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(
    initialEditingAppointment?.id || (appointmentId as string) || null
  );
  const [appointmentReason, setAppointmentReason] = useState(
    initialEditingAppointment?.reason || "Control"
  );

  const [notificationScheduled, setNotificationScheduled] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    daysInAdvance: 1,
    notificationHour: 9,
    notificationMinute: 0,
  });
  const [treatmentType, setTreatmentType] = useState<"ortodoncia" | "general">(
    patient?.treatmentType || "general"
  );
  const [appointmentFrequency, setAppointmentFrequency] = useState<string>(
    patient?.appointmentFrequency?.toString() || "4"
  );

  useEffect(() => {
    let isMounted = true;
    if (!patient) return;

    NotificationService.getAllScheduledNotifications()
      .then((scheduled) => {
        if (!isMounted) return;
        const hasNotification = scheduled.some(
          (n) => n.identifier.startsWith(`appointment_${patient.id}`)
        );
        setNotificationScheduled(hasNotification);
      })
      .catch((error) => {
        console.error("Error loading notification status:", error);
      });

    NotificationService.getSettings()
      .then((settings) => {
        if (!isMounted) return;
        setNotificationSettings({
          daysInAdvance: settings.daysInAdvance,
          notificationHour: settings.notificationHour,
          notificationMinute: settings.notificationMinute,
        });
      })
      .catch((error) => {
        console.error("Error loading notification settings:", error);
      });

    return () => {
      isMounted = false;
    };
  }, [patient]);

  const handleDateChange = (event: any, pickedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }

    if (event.type === "dismissed") {
      return;
    }

    if (pickedDate) {
      setSelectedDate(pickedDate);
    }
  };

  const handleSelectAppointmentToEdit = (appt: { id: string; date: string; reason?: string }) => {
    setEditingAppointmentId(appt.id);
    setSelectedDate(new Date(appt.date));
    setAppointmentReason(appt.reason || "Control");
  };

  const handleCancelEditing = () => {
    setEditingAppointmentId(null);
    setAppointmentReason("Control");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    setSelectedDate(tomorrow);
  };

  const handleSave = async () => {
    if (!patient) return;

    if (selectedDate <= new Date()) {
      dialog.alert(
        "Fecha inválida",
        "La fecha y hora de la cita debe ser en el futuro.",
        "error"
      );
      return;
    }

    // Verificar conflicto con bloque de especialista
    const conflict = findSpecialistConflictForAppointment(selectedDate, specialistBlocks);
    if (conflict) {
      dialog.alert(
        "Horario ocupado",
        `El doctor especialista ${conflict.doctorName} (${conflict.specialty || 'especialista'}) trabaja en el consultorio ese día de ${conflict.startTime} a ${conflict.endTime}. Por favor elige otra hora.`,
        "error"
      );
      return;
    }

    const finalReason = appointmentReason.trim() || (treatmentType === "ortodoncia" ? "Control de ortodoncia" : "Consulta");

    // Guardar según si es edición o nueva cita
    if (editingAppointmentId) {
      updateAppointment(patient.id, editingAppointmentId, {
        date: selectedDate.toISOString(),
        reason: finalReason,
        status: "scheduled",
      });
    } else {
      addAppointment(patient.id, {
        date: selectedDate.toISOString(),
        reason: finalReason,
        status: "scheduled",
      });
    }

    // Actualizar datos del tratamiento
    updatePatient(patient.id, {
      treatmentType,
      appointmentFrequency: parseInt(appointmentFrequency, 10) || undefined,
    });

    dialog.alert(
      editingAppointmentId ? "Cita Actualizada" : "Cita Programada",
      editingAppointmentId
        ? "La cita se ha modificado exitosamente."
        : "La nueva cita ha sido programada exitosamente.",
      "success",
      () => {
        if (date) {
          router.dismiss(2);
        } else {
          router.back();
        }
      }
    );
  };

  const handleDeleteSpecificAppointment = (apptId: string, apptDateStr: string) => {
    if (!patient) return;

    const formatted = new Date(apptDateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });

    dialog.confirm(
      "Eliminar Cita",
      `¿Deseas eliminar la cita programada para el ${formatted}?`,
      () => {
        deleteAppointment(patient.id, apptId);
        if (editingAppointmentId === apptId) {
          handleCancelEditing();
        }
      },
      "danger"
    );
  };

  const handleCancelNotification = async () => {
    if (!patient) return;

    dialog.confirm(
      "¿Cancelar notificaciones?",
      "Se eliminarán los recordatorios automáticos de citas para este paciente.",
      async () => {
        await NotificationService.cancelAppointmentNotification(patient.id);
        setNotificationScheduled(false);
        dialog.alert("Canceladas", "Notificaciones canceladas", "success");
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

  const activeAppointments = (patient.appointments || []).filter(
    (a) => a.status !== "cancelled" && a.status !== "completed"
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
          <Ionicons name="calendar" size={28} color={colors.primary} />
        </View>
        <Text style={styles.title}>
          {editingAppointmentId ? "Modificar Cita" : "Programar Cita"}
        </Text>
        <Text style={styles.subtitle}>{patient.name}</Text>
      </View>

      {/* Lista de citas activas si tiene más de 0 
      {activeAppointments.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>
              Citas Programadas ({activeAppointments.length})
            </Text>
            {editingAppointmentId && (
              <TouchableOpacity
                style={styles.newApptButton}
                onPress={handleCancelEditing}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.newApptButtonText}>Nueva Cita</Text>
              </TouchableOpacity>
            )}
          </View>

          {activeAppointments.map((appt) => {
            const isBeingEdited = editingAppointmentId === appt.id;
            const apptDateObj = new Date(appt.date);
            const dateDisplay = apptDateObj.toLocaleDateString("es-ES", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
            const timeDisplay = apptDateObj.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <View
                key={appt.id}
                style={[
                  styles.appointmentItem,
                  isBeingEdited && styles.appointmentItemEditing,
                ]}
              >
                <View style={styles.appointmentLeft}>
                  <View
                    style={[
                      styles.appointmentDot,
                      isBeingEdited && { backgroundColor: colors.primary },
                    ]}
                  />
                  <View>
                    <Text style={styles.appointmentDateText}>
                      {dateDisplay} a las {timeDisplay}
                    </Text>
                    <Text style={styles.appointmentReasonText}>
                      {appt.reason || "Control"}
                    </Text>
                  </View>
                </View>

                <View style={styles.appointmentActions}>
                  <TouchableOpacity
                    style={[
                      styles.itemActionButton,
                      isBeingEdited && styles.itemActionButtonActive,
                    ]}
                    onPress={() => handleSelectAppointmentToEdit(appt)}
                  >
                    <Ionicons
                      name="create-outline"
                      size={18}
                      color={isBeingEdited ? colors.primary : colors.textSecondary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.itemActionButton}
                    onPress={() =>
                      handleDeleteSpecificAppointment(appt.id, appt.date)
                    }
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.danger}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}*/}

      {/* Formulario de Fecha, Hora y Motivo */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionTitle}>
            {editingAppointmentId ? "Modificar Cita Seleccionada" : "Nueva Cita"}
          </Text>
          {editingAppointmentId && (
            <TouchableOpacity onPress={handleCancelEditing}>
              <Text style={styles.cancelEditLink}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Motivo de la Cita */}
        <Text style={styles.label}>Motivo o Procedimiento</Text>
        <TextInput
          style={styles.reasonInput}
          value={appointmentReason}
          onChangeText={setAppointmentReason}
          placeholder="Ej. Control de ortodoncia, Calza, Limpieza..."
          placeholderTextColor="#999"
        />

        {/* Chips de sugerencias */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chilsScroll}
          contentContainerStyle={styles.chipsContainer}
        >
          {REASON_SUGGESTIONS.map((Chip) => (
            <TouchableOpacity
              key={Chip}
              style={[
                styles.Chip,
                appointmentReason === Chip && styles.chipActive,
              ]}
              onPress={() => setAppointmentReason(Chip)}
            >
              <Text
                style={[
                  styles.chipText,
                  appointmentReason === Chip && styles.chipTextActive,
                ]}
              >
                {Chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.separator} />

        {/* Date Selection */}
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <View style={styles.dateButtonContent}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color={colors.primary}
            />
            <View style={styles.dateTextContainer}>
              <Text style={styles.label}>Fecha</Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        <View style={styles.separator} />

        {/* Time Selection */}
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowTimePicker(true)}
        >
          <View style={styles.dateButtonContent}>
            <Ionicons name="time-outline" size={24} color={colors.primary} />
            <View style={styles.dateTextContainer}>
              <Text style={styles.label}>Hora</Text>
              <Text style={styles.dateText}>{formattedTime}</Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
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

      {/* Treatment type & Frequency Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>tipo de Tratamiento</Text>

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
                  ? colors.primary
                  : colors.textSecondary
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
                  ? colors.primary
                  : colors.textSecondary
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
              Frecuencia de citas habitual (semanas)
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
          </View>
        )}
      </View>

      {/* Notifications Card */}
      <View style={styles.card}>
        <View style={styles.notificationRow}>
          <Ionicons
            name={notificationScheduled ? "notifications" : "notifications-off"}
            size={24}
            color={
              notificationScheduled ? colors.primary : colors.textSecondary
            }
          />
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle}>
              {notificationScheduled
                ? "Notificaciones activas"
                : "Sin notificaciones"}
            </Text>
            <Text style={styles.notificationSubtitle}>
              Se enviará un recordatorio{" "}
              {notificationSettings.daysInAdvance === 1
                ? "el día anterior"
                : `${notificationSettings.daysInAdvance} días antes`}{" "}
              a la hora de cada cita programada
            </Text>
          </View>
        </View>

        {notificationScheduled && (
          <TouchableOpacity
            style={styles.cancelNotificationButton}
            onPress={handleCancelNotification}
          >
            <Text style={styles.cancelNotificationText}>
              Cancelar notificaciones
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Botón Guardar / Agregar */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Ionicons name="checkmark-circle" size={24} color="white" />
        <Text style={styles.saveButtonText}>
          {editingAppointmentId ? "Guardar Cambios de Cita" : "+ Programar Cita"}
        </Text>
      </TouchableOpacity>

      {/* Quitar todas las citas si el paciente tiene alguna */}
      {activeAppointments.length > 0 && (
        <TouchableOpacity
          style={styles.clearDateButton}
          onPress={() => {
            dialog.confirm(
              "Quitar Todas las Citas",
              '¿Estás seguro de quitar todas las citas de este paciente? Quedará en estado "Sin Cita Agendada".',
              async () => {
                updatePatient(patient.id, {
                  appointments: [],
                  nextControlDate: undefined,
                });
                await NotificationService.cancelAppointmentNotification(
                  patient.id
                );
                router.back();
              },
              "danger"
            );
          }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={styles.clearDateButtonText}>
            Quitar Todas las Citas
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
      >
        <Text style={styles.cancelButtonText}>Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  cancelEditLink: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: "600",
  },
  newApptButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary + "12",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  newApptButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  appointmentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appointmentItemEditing: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "08",
  },
  appointmentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  appointmentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
  },
  appointmentDateText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    textTransform: "capitalize",
  },
  appointmentReasonText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  appointmentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemActionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  itemActionButtonActive: {
    backgroundColor: colors.primary + "20",
  },
  reasonInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    marginBottom: 10,
  },
  chilsScroll: {
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  Chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  chipTextActive: {
    color: "white",
    fontWeight: "600",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary + "25",
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
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: "500",
  },
  dateText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    textTransform: "capitalize",
  },
  separator: {
    height: 1,
    backgroundColor: colors.background,
    marginVertical: 10,
  },
  doneButton: {
    backgroundColor: colors.primary,
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
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cancelNotificationButton: {
    marginTop: 12,
    padding: 10,
    backgroundColor: colors.danger + "10",
    borderRadius: 8,
    alignItems: "center",
  },
  cancelNotificationText: {
    color: colors.danger,
    fontWeight: "600",
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "bold",
  },
  cancelButton: {
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 18,
    color: colors.danger,
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.surface,
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.danger + "40",
  },
  clearDateButtonText: {
    color: colors.danger,
    fontSize: 15,
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
    padding: 14,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 6,
  },
  treatmentTypeButtonActive: {
    backgroundColor: colors.primary + "10",
    borderColor: colors.primary,
  },
  treatmentTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  treatmentTypeTextActive: {
    color: colors.primary,
  },
  frequencyContainer: {
    marginTop: 14,
    gap: 8,
  },
  frequencyLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  frequencyButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  frequencyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  frequencyButtonTextActive: {
    color: "white",
  },
});
