import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/Colors";
import { useApp } from "../context/AppContext";
import { NotificationService } from "../services/NotificationService";

export default function AddPatient() {
  const router = useRouter();
  const { addPatient, patients } = useApp();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [treatmentType, setTreatmentType] = useState<"ortodoncia" | "general">(
    "general",
  );
  const [hasAppointment, setHasAppointment] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [appointmentFrequency, setAppointmentFrequency] = useState<string>("4");
  const [appointmentDay, setAppointmentDay] = useState<string>("");

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "El nombre es obligatorio");
      return;
    }

    // Check for duplicate names
    const duplicateName = patients.find(
      (p) => p.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (duplicateName) {
      Alert.alert(
        "Nombre Duplicado",
        "Ya existe un paciente con este nombre. Por favor, agrega algo único (ej. apellido completo, inicial, etc.)"
      );
      return;
    }

    if (!monthlyFee.trim()) {
      Alert.alert("Error", "La mensualidad es obligatoria");
      return;
    }

    const newPatient = {
      name,
      phone,
      monthlyFee: parseFloat(monthlyFee),
      startDate: new Date().toISOString(),
      treatmentType,
      ...(hasAppointment && {
        nextControlDate: appointmentDate.toISOString(),
      }),
      ...(treatmentType === "ortodoncia" && {
        appointmentFrequency: parseInt(appointmentFrequency, 10),
        ...(appointmentDay && { appointmentDay: parseInt(appointmentDay, 10) }),
      }),
    };

    addPatient(newPatient);

    // Schedule notification if appointment was set
    if (hasAppointment) {
      // Note: This is a workaround - ideally addPatient should return the ID
      await NotificationService.scheduleAppointmentNotification(
        `temp_${Date.now()}`,
        name,
        appointmentDate,
      );
    }

    Alert.alert(
      "✅ Paciente Registrado",
      hasAppointment
        ? "Paciente guardado con cita programada"
        : "Paciente guardado exitosamente",
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }

    if (event.type === "dismissed") {
      return;
    }

    if (date) {
      setAppointmentDate(date);
    }
  };

  const formattedDate = appointmentDate.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = appointmentDate.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre Completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Juan Pérez"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. 55 1234 5678"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mensualidad ($)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            keyboardType="numeric"
            value={monthlyFee}
            onChangeText={setMonthlyFee}
          />
        </View>

        {/* Treatment Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tipo de Tratamiento</Text>
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
                size={20}
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
                size={20}
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
        </View>

        {/* Appointment Frequency for Orthodontics */}
        {treatmentType === "ortodoncia" && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Frecuencia de citas (semanas)</Text>
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Día del mes para citas</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 5 (para citas el día 5 de cada mes)"
                keyboardType="numeric"
                value={appointmentDay}
                onChangeText={(text) => {
                  // Only allow numbers 1-31
                  const num = parseInt(text, 10);
                  if (text === "" || (num >= 1 && num <= 31)) {
                    setAppointmentDay(text);
                  }
                }}
                maxLength={2}
              />
              <Text style={styles.helperText}>
                💡 Este día se usará para calcular las próximas citas automáticamente
              </Text>
            </View>
          </>
        )}

        {/* Optional Appointment */}
        <View style={styles.appointmentToggle}>
          <View style={styles.toggleHeader}>
            <Ionicons name="calendar" size={24} color={Colors.primary} />
            <Text style={styles.toggleLabel}>¿Programar primera cita?</Text>
            <Switch
              value={hasAppointment}
              onValueChange={setHasAppointment}
              trackColor={{ false: "#ccc", true: Colors.primary + "80" }}
              thumbColor={hasAppointment ? Colors.primary : "#f4f3f4"}
            />
          </View>
        </View>

        {hasAppointment && (
          <View style={styles.appointmentCard}>
            {/* Date Selection */}
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={Colors.primary}
              />
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateLabel}>Fecha</Text>
                <Text style={styles.dateText}>{formattedDate}</Text>
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
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateLabel}>Hora</Text>
                <Text style={styles.dateText}>{formattedTime}</Text>
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
                value={appointmentDate}
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
                value={appointmentDate}
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
        )}

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Guardar Paciente</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  form: {
    padding: 24,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  input: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  treatmentTypeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  treatmentTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "white",
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
  frequencyButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  frequencyButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  frequencyButtonTextActive: {
    color: "white",
  },
  appointmentToggle: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  appointmentCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  dateTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    textTransform: "capitalize",
  },
  separator: {
    height: 1,
    backgroundColor: Colors.background,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  doneButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontStyle: "italic",
  },
});
