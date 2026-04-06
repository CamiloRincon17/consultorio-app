import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useState, useMemo } from "react";
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
  Modal,
} from "react-native";
import { Colors } from "../shared/constants/Colors";
import { useApp } from "../context/AppContext";
import { NotificationService } from "../services/NotificationService";
import { FormInput, PrimaryButton } from "../shared/components";
import { formatCOPShort } from "../shared/utils/formatCOP";
const PROCEDIMIENTOS_PREDEFINIDOS = [
  { id: 'Restauración dental', nombre: 'Restauración dental', precio: '50000' },
  { id: 'Limpieza dental', nombre: 'Limpieza dental', precio: '80000' },
  { id: 'Extracción dental', nombre: 'Extracción dental', precio: '80000' },
  { id: 'Extracción de cordal', nombre: 'Extracción de cordal', precio: '150000' },
  { id: 'Tratamiento de conducto unirradicular', nombre: 'Tratamiento de conducto unirradicular', precio: '310000' },
  { id: 'Tratamiento de conducto birradicular', nombre: 'Tratamiento de conducto birradicular', precio: '350000' },
  { id: 'Tratamiento de conducto multirradicular', nombre: 'Tratamiento de conducto multirradicular', precio: '410000' },
  { id: 'Retratamiento unirradicular', nombre: 'Retratamiento unirradicular', precio: '350000' },
  { id: 'Retratamiento birradicular', nombre: 'Retratamiento birradicular', precio: '380000' },
  { id: 'Retratamiento multirradicular', nombre: 'Retratamiento multirradicular', precio: '450000' },
  { id: 'Montaje de ortodoncia', nombre: 'Montaje de ortodoncia', precio: '300000' },
  { id: 'Control de ortodoncia', nombre: 'Control de ortodoncia', precio: '60000' },
  { id: 'Reparación de brackets', nombre: 'Reparación de brackets', precio: '25000' },
  { id: 'Recorte de encía', nombre: 'Recorte de encía', precio: '70000' },
  { id: 'Corona metal cerámica', nombre: 'Corona metal cerámica', precio: '600000' },
  { id: 'Corona libre de metal', nombre: 'Corona libre de metal', precio: '900000' },
  { id: 'Protesis(Acker)', nombre: 'Protesis(Acker)', precio: '150000' },
];

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
  const [procedure, setProcedure] = useState("");
  const [isCustomProcedure, setIsCustomProcedure] = useState(false);

  const [showProcedurePicker, setShowProcedurePicker] = useState(false);
  const [searchProcedureQuery, setSearchProcedureQuery] = useState('');

  const filteredProcedures = useMemo(() => {
      if (!searchProcedureQuery.trim()) return PROCEDIMIENTOS_PREDEFINIDOS;
      return PROCEDIMIENTOS_PREDEFINIDOS.filter(p => 
          p.nombre.toLowerCase().includes(searchProcedureQuery.toLowerCase())
      );
  }, [searchProcedureQuery]);

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
        <FormInput
          label="Nombre Completo"
          placeholder="Ej. Uriel Mauricio"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <FormInput
          label="Teléfono"
          placeholder="Ej. 3120000000"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

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
        {treatmentType === "general" && (
          <>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Procedimiento / Motivo</Text>
                <TouchableOpacity
                    style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                    onPress={() => setShowProcedurePicker(true)}
                >
                    <Text style={{ fontSize: 16, color: (procedure || isCustomProcedure ? Colors.text : Colors.textSecondary) }}>
                        {isCustomProcedure ? 'Otro (Personalizado)' : (procedure || 'Seleccionar procedimiento...')}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
                {isCustomProcedure && (
                    <TextInput
                        style={[styles.input, { marginTop: 8 }]}
                        placeholder="Escribe el procedimiento..."
                        value={procedure}
                        onChangeText={setProcedure}
                    />
                )}
            </View>
            <View style={styles.inputGroup}>
              <FormInput
                label="Precio del tratamiento ($)"
                placeholder="0.00"
                keyboardType="numeric"
                value={monthlyFee}
                onChangeText={setMonthlyFee}
              />
            </View>
          </>
        )}
        {/* Appointment Frequency for Orthodontics */}
        {treatmentType === "ortodoncia" && (

          <>
          <FormInput
          label="Mensualidad ($)"
          placeholder="0.00"
          keyboardType="numeric"
          value={monthlyFee}
          onChangeText={setMonthlyFee}
        />
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

            <FormInput
              label="Día del mes para citas"
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
              helperText="💡 Este día se usará para calcular las próximas citas automáticamente"
            />
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

        <PrimaryButton label="Guardar Paciente" onPress={handleSave} />
      </ScrollView>

      {/* Procedure Picker Modal */}
      <Modal visible={showProcedurePicker} animationType="slide" transparent onRequestClose={() => setShowProcedurePicker(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: '#F2F2F7', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' }}>
                  <View style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
                      backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,
                  }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Seleccionar Procedimiento</Text>
                      <TouchableOpacity onPress={() => setShowProcedurePicker(false)}>
                          <Ionicons name="close" size={24} color={Colors.text} />
                      </TouchableOpacity>
                  </View>
                  <View style={{
                      flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
                      marginHorizontal: 16, marginTop: 16, paddingHorizontal: 12,
                      borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
                  }}>
                      <Ionicons name="search" size={20} color={Colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                          style={{ flex: 1, paddingVertical: 12, fontSize: 16, color: Colors.text }}
                          placeholder="Buscar procedimiento..."
                          value={searchProcedureQuery}
                          onChangeText={setSearchProcedureQuery}
                          autoCapitalize="none"
                      />
                  </View>
                  <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
                      {filteredProcedures.map(proc => (
                          <TouchableOpacity
                              key={proc.id}
                              style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 8 }}
                              onPress={() => {
                                  setIsCustomProcedure(false);
                                  setProcedure(proc.nombre);
                                  setMonthlyFee(proc.precio);
                                  setShowProcedurePicker(false);
                                  setSearchProcedureQuery('');
                              }}
                          >
                              <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.text }}>{proc.nombre}</Text>
                              <Text style={{ fontSize: 14, color: Colors.textSecondary }}>{formatCOPShort(parseInt(proc.precio))}</Text>
                          </TouchableOpacity>
                      ))}
                      {filteredProcedures.length === 0 && (
                          <Text style={{ textAlign: 'center', color: Colors.textSecondary, marginTop: 20 }}>No hay resultados.</Text>
                      )}
                      <TouchableOpacity
                          style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 40 }}
                          onPress={() => {
                              setIsCustomProcedure(true);
                              if (PROCEDIMIENTOS_PREDEFINIDOS.some(p => p.nombre === procedure)) {
                                  setProcedure('');
                                  setMonthlyFee('');
                              }
                              setShowProcedurePicker(false);
                              setSearchProcedureQuery('');
                          }}
                      >
                          <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.primary }}>+ Agregar Otro (Personalizado)</Text>
                      </TouchableOpacity>
                  </ScrollView>
              </View>
          </View>
      </Modal>
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
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  itemSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  itemText: {
    fontSize: 14,
    color: '#666',
  },
  itemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
