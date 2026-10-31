import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState, useMemo } from "react";
import {
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
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, useThemedStyles, type Palette } from "../shared/theme";
import { usePatientsStore } from "../features/patients/store";
import { NotificationService } from "../services/NotificationService";
import { FormInput, PrimaryButton } from "../shared/components";
import { formatCOPShort, formatInputCOP, parseInputCOP } from "../shared/utils/formatCOP";
import { useDialog } from "../shared/context/DialogContext";
import { validatePhone, validateAmount } from "../shared/utils/validation";
import { useSpecialistStore } from "../features/specialists/store";
import { findSpecialistConflictForAppointment } from "../shared/utils/scheduleUtils";

const PROCEDIMIENTOS_PREDEFINIDOS = [
  { id: 'Restauración dental', Nombre: 'Restauración dental', precio: '50000' },
  { id: 'Limpieza dental', Nombre: 'Limpieza dental', precio: '80000' },
  { id: 'Extracción dental', Nombre: 'Extracción dental', precio: '80000' },
  { id: 'Extracción de cordal', Nombre: 'Extracción de cordal', precio: '150000' },
  { id: 'Tratamiento de conducto unirradicular', Nombre: 'Tratamiento de conducto unirradicular', precio: '310000' },
  { id: 'Tratamiento de conducto birradicular', Nombre: 'Tratamiento de conducto birradicular', precio: '350000' },
  { id: 'Tratamiento de conducto multirradicular', Nombre: 'Tratamiento de conducto multirradicular', precio: '410000' },
  { id: 'Retratamiento unirradicular', Nombre: 'Retratamiento unirradicular', precio: '350000' },
  { id: 'Retratamiento birradicular', Nombre: 'Retratamiento birradicular', precio: '380000' },
  { id: 'Retratamiento multirradicular', Nombre: 'Retratamiento multirradicular', precio: '450000' },
  { id: 'Montaje de ortodoncia', Nombre: 'Montaje de ortodoncia', precio: '300000' },
  { id: 'Control de ortodoncia', Nombre: 'Control de ortodoncia', precio: '60000' },
  { id: 'Reparación de brackets', Nombre: 'Reparación de brackets', precio: '25000' },
  { id: 'Recorte de encía', Nombre: 'Recorte de encía', precio: '70000' },
  { id: 'Corona metal cerámica', Nombre: 'Corona metal cerámica', precio: '600000' },
  { id: 'Corona Libre de metal', Nombre: 'Corona Libre de metal', precio: '900000' },
  { id: 'Protesis(Acker)', Nombre: 'Protesis(Acker)', precio: '150000' },
];

export default function AddPatient() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const addPatient = usePatientsStore((s) => s.addPatient);
  const patients = usePatientsStore((s) => s.patients);
  const dialog = useDialog();
  const specialistBlocks = useSpecialistStore((s) => s.specialistBlocks);
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [treatmentType, setTreatmentType] = useState<"ortodoncia" | "general">(
    "general",
  );
  const [hasAppointment, setHasAppointment] = useState(!!params.date);
  const [appointmentDate, setAppointmentDate] = useState(params.date ? new Date(params.date as string + "T12:00:00Z") : new Date());
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
          p.Nombre.toLowerCase().includes(searchProcedureQuery.toLowerCase())
      );
  }, [searchProcedureQuery]);

  const handleSave = async () => {
    if (!name.trim()) {
      dialog.alert("Error", "El Nombre es obligatorio", "error");
      return;
    }

    // Validate phone
    const phoneError = validatePhone(phone);
    if (phoneError) {
      dialog.alert("Teléfono inválido", phoneError, "error");
      return;
    }

    // Validate amount
    const amountError = validateAmount(monthlyFee);
    if (amountError) {
      dialog.alert("Monto inválido", amountError, "error");
      return;
    }

    // Check for duplicate names
    const duplicateName = patients.find(
      (p) => p.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (duplicateName) {
      dialog.alert(
        "Nombre Duplicado",
        "Ya existe un paciente con este Nombre. Por favor, agrega algo único (ej. apellido completo, inicial, etc.)",
        "error"
      );
      return;
    }

    // Verificar conflicto con bloque de especialista si se agendó cita
    if (hasAppointment) {
      const conflict = findSpecialistConflictForAppointment(appointmentDate, specialistBlocks);
      if (conflict) {
        dialog.alert(
          "Horario ocupado",
          `El doctor especialista ${conflict.doctorName} (${conflict.specialty || 'especialista'}) trabaja en el consultorio ese día de ${conflict.startTime} a ${conflict.endTime}. Por favor elige otra hora para la cita.`,
          "error"
        );
        return;
      }
    }



    const newPatient = {
      name,
      phone,
      monthlyFee: parseInputCOP(monthlyFee),
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
      NotificationService.scheduleAppointmentNotification(
        `temp_${Date.now()}`,
        name,
        appointmentDate,
      );
    }

    dialog.alert(
      "paciente Registrado",
      hasAppointment
        ? "paciente guardado con cita programada"
        : "paciente guardado exitosamente",
      "success",
      () => router.back()
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
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* Header fijo con botón de volver */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Nuevo paciente</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.form,
          { paddingBottom: Math.max(insets.bottom + 48, 64) }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <FormInput
          //iconComponent={
            //<MaterialCommunityIcons
            //  name="person"
             // size={20}
             // color={colors.textSecondary}
           // />
          //}
          icon="person-sharp"
          label="  Nombre Completo"
          placeholder=""
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <FormInput
          icon="call-sharp"
          label="  Teléfono"
          placeholder=""
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
              <MaterialCommunityIcons
                name="toothbrush"
                size={29}
                color={
                  treatmentType === "general"
                    ? colors.text
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
              <MaterialCommunityIcons
                name="tooth"
                size={25}
                color={
                  treatmentType === "ortodoncia"
                    ? colors.icon
                    : colors.icon
                }
              />
              <Text
                style={[
                  styles.treatmentTypeText,
                  treatmentType === "ortodoncia" &&
                  styles.treatmentTypeTextActive,
                ]}
              >
                ortodoncia
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
                    <Text style={{ fontSize: 16, color: (procedure || isCustomProcedure ? colors.text : colors.textSecondary) }}>
                        {isCustomProcedure ? 'Otro (Personalizado)' : (procedure || 'seleccionar Procedimiento...')}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {isCustomProcedure && (
                    <TextInput
                        style={[styles.input, { marginTop: 8 }]}
                        placeholder="Escribe el Procedimiento..."
                        value={procedure}
                        onChangeText={setProcedure}
                    />
                )}
            </View>
            <View style={styles.inputGroup}>
              <FormInput
                iconComponent={
                  <FontAwesome5 name="money-bill-wave" size={24} color="black" />                
                }
                label="precio del Tratamiento"
                placeholder=""
                keyboardType="numeric"
                value={monthlyFee}
                onChangeText={(val) => setMonthlyFee(formatInputCOP(val))}
              />
            </View>
          </>
        )}
        {/* Appointment frequency for Orthodontics */}
        {treatmentType === "ortodoncia" && (

          <>
          <FormInput
          label="Mensualidad ($)"
          placeholder="ej. 60.000"
          keyboardType="numeric"
          value={monthlyFee}
          onChangeText={(val) => setMonthlyFee(formatInputCOP(val))}
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
            <Ionicons name="calendar" size={24} color={colors.primary} />
            <Text style={styles.toggleLabel}>¿Programar primera cita?</Text>
            <Switch
              value={hasAppointment}
              onValueChange={setHasAppointment}
              trackColor={{ false: "#ccc", true: colors.primary + "80" }}
              thumbColor={hasAppointment ? colors.primary : "#f4f3f4"}
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
                color={colors.primary}
              />
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateLabel}>fecha</Text>
                <Text style={styles.dateText}>{formattedDate}</Text>
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
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateLabel}>Hora</Text>
                <Text style={styles.dateText}>{formattedTime}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Date picker */}
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

            {/* Time picker */}
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

        <PrimaryButton label="Guardar paciente" onPress={handleSave} />
      </ScrollView>

      {/* procedure picker Modal */}
      <Modal visible={showProcedurePicker} animationType="slide" transparent onRequestClose={() => setShowProcedurePicker(false)}>
          <TouchableOpacity 
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
              activeOpacity={1}
              onPress={() => setShowProcedurePicker(false)}
          >
              <Pressable style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' }}>
                  <View style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
                      backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
                  }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>seleccionar Procedimiento</Text>
                      <TouchableOpacity onPress={() => setShowProcedurePicker(false)}>
                          <Ionicons name="close" size={24} color={colors.text} />
                      </TouchableOpacity>
                  </View>
                  <View style={{
                      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
                      marginHorizontal: 16, marginTop: 16, paddingHorizontal: 12,
                      borderRadius: 12, borderWidth: 1, borderColor: colors.border,
                  }}>
                      <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                          style={{ flex: 1, paddingVertical: 12, fontSize: 16, color: colors.text }}
                          placeholder="Buscar Procedimiento..."
                          value={searchProcedureQuery}
                          onChangeText={setSearchProcedureQuery}
                          autoCapitalize="none"
                      />
                  </View>
                  <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                      {filteredProcedures.map(proc => (
                          <TouchableOpacity
                              key={proc.id}
                              style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 8 }}
                              onPress={() => {
                                  setIsCustomProcedure(false);
                                  setProcedure(proc.Nombre);
                                  setMonthlyFee(proc.precio);
                                  setShowProcedurePicker(false);
                                  setSearchProcedureQuery('');
                              }}
                          >
                              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{proc.Nombre}</Text>
                              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{formatCOPShort(parseInt(proc.precio))}</Text>
                          </TouchableOpacity>
                      ))}
                      {filteredProcedures.length === 0 && (
                          <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 20 }}>No hay resultados.</Text>
                      )}
                      <TouchableOpacity
                          style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 40 }}
                          onPress={() => {
                              setIsCustomProcedure(true);
                              if (PROCEDIMIENTOS_PREDEFINIDOS.some(p => p.Nombre === procedure)) {
                                  setProcedure('');
                                  setMonthlyFee('');
                              }
                              setShowProcedurePicker(false);
                              setSearchProcedureQuery('');
                          }}
                      >
                          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>+ Agregar Otro (Personalizado)</Text>
                      </TouchableOpacity>
                  </ScrollView>
              </Pressable>
          </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
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
    color: colors.text,
  },
  input: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 8,
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
  frequencyButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 2,
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
  appointmentToggle: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
  },
  appointmentCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  dateTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    textTransform: "capitalize",
  },
  separator: {
    height: 1,
    backgroundColor: colors.background,
  },
  doneButton: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  itemText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
