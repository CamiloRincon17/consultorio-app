import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "../shared/constants/Colors";
import { FormInput, PrimaryButton, TimePickerModal } from "../shared/components";
import { useSpecialistStore } from "../features/specialists/store";
import { useFinanceStore } from "../features/finance/store";
import { usePatientsStore } from "../features/patients/store";
import { useDialog } from "../shared/context/DialogContext";
import { toLocalDateString } from "../shared/utils/dateUtils";
import { generateId } from "../shared/utils/generateId";
import { findPatientConflictForSpecialistBlock } from "../shared/utils/scheduleUtils";

/** Formatea número como 150.000 al tipear (estilo COP sin decimales) */
function formatInputCOP(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("es-CO");
}

/** Convierte string formateado ("150.000") a número (150000) */
function parseInputCOP(formatted: string): number {
  return parseFloat(formatted.replace(/\./g, "").replace(/,/g, ".")||"0") || 0;
}

const PRESET_SPECIALTIES = [
  "Ortodoncia",
  "Endodoncia",
  "Periodoncia",
  "Cirugía Maxilofacial",
  "Odontopediatría",
  "Implantología",
  "Rehabilitación Oral",
  "Odontología Estética",
  "Otra (especificar)",
];

const DAYS_OF_WEEK = [
  { id: 1, name: "Lun", fullName: "Lunes" },
  { id: 2, name: "Mar", fullName: "Martes" },
  { id: 3, name: "Mié", fullName: "Miércoles" },
  { id: 4, name: "Jue", fullName: "Jueves" },
  { id: 5, name: "Vie", fullName: "Viernes" },
  { id: 6, name: "Sáb", fullName: "Sábado" },
  { id: 0, name: "Dom", fullName: "Domingo" },
];



const PRESET_SHIFTS = [
  { title: "Turno Mañana", startTime: "08:00 AM", endTime: "12:00 PM" },
  { title: "Turno Tarde", startTime: "02:00 PM", endTime: "06:00 PM" },
  { title: "Turno Noche", startTime: "06:00 PM", endTime: "09:00 PM" },
  { title: "Jornada Completa", startTime: "08:00 AM", endTime: "05:00 PM" },
];

/** Convertidor de 24h a 12h AM/PM para retrocompatibilidad */
function formatTo12Hour(timeStr: string): string {
  if (!timeStr) return "08:00 AM";
  if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return "08:00 AM";
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const hh = String(h).padStart(2, "0");
  const mm = mStr ? mStr.substring(0, 2) : "00";
  return `${hh}:${mm} ${period}`;
}

/** Convierte string de 12 horas AM/PM a Date para DateTimePicker nativo */
function parse12HourToDate(time12h: string): Date {
  const d = new Date();
  if (!time12h) return d;
  const match = time12h.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return d;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  d.setHours(h, m, 0, 0);
  return d;
}

/** Convierte objeto Date a string 12 horas AM/PM */
function dateTo12HourString(d: Date): string {
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hoursStr = String(hours).padStart(2, "0");
  return `${hoursStr}:${minutes} ${period}`;
}

export default function RegisterSpecialistBlockScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dialog = useDialog();

  const {
    specialistBlocks,
    savedDoctors,
    addSpecialistBlock,
    updateSpecialistBlock,
    deleteSpecialistBlock,
  } = useSpecialistStore();

  const patients = usePatientsStore((s) => s.patients);

  const blockId = params.id as string | undefined;
  const existingBlock = specialistBlocks.find((b) => b.id === blockId);

  // Estado del Doctor
  const [doctorName, setDoctorName] = useState(existingBlock?.doctorName || "");
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [isWritingNewDoctor, setIsWritingNewDoctor] = useState(!existingBlock?.doctorName);

  // Estado de Especialidades (Ortodoncia predeterminada)
  const initialSpecialty = existingBlock?.specialty || "";
  const isPresetSpecialty = PRESET_SPECIALTIES.includes(initialSpecialty);

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(
    initialSpecialty
      ? isPresetSpecialty
        ? initialSpecialty
        : "Otra (especificar)"
      : "Ortodoncia" // Predeterminada Ortodoncia
  );
  const [customSpecialty, setCustomSpecialty] = useState<string>(
    initialSpecialty && !isPresetSpecialty ? initialSpecialty : ""
  );
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);

  const [shiftTitle, setShiftTitle] = useState(existingBlock?.shiftTitle || "Turno Mañana");

  // Recurrencia por defecto apagada
  const [isRecurring, setIsRecurring] = useState(existingBlock?.isRecurring ?? false);
  const [selectedDays, setSelectedDays] = useState<number[]>(
    existingBlock?.recurringDays || [1, 3]
  );

  const paramDate = params.date as string | undefined;

  const [singleDate, setSingleDate] = useState(() => {
    if (existingBlock?.date) return new Date(existingBlock.date + "T12:00:00Z");
    if (paramDate) return new Date(paramDate + "T12:00:00Z");
    return new Date();
  });
  const [singleDateStr, setSingleDateStr] = useState(() => {
    if (existingBlock?.date) return existingBlock.date;
    if (paramDate) return paramDate;
    return toLocalDateString(new Date());
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Horas en formato 12 horas AM / PM
  const [startTime, setStartTime] = useState(formatTo12Hour(existingBlock?.startTime || "08:00 AM"));
  const [endTime, setEndTime] = useState(formatTo12Hour(existingBlock?.endTime || "12:00 PM"));
  
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  // El mismo modal rueda se usa en web y móvil
  const [timePickerTarget, setTimePickerTarget] = useState<"start" | "end" | null>(null);

  const [notes, setNotes] = useState(existingBlock?.notes || "");
  // rentalFee se guarda y muestra formateado: "150.000" en pantalla, número en el store
  const [rentalFeeDisplay, setRentalFeeDisplay] = useState(
    existingBlock?.rentalFee ? formatInputCOP(String(Math.round(existingBlock.rentalFee))) : ""
  );

  const { addTransaction, updateTransaction, deleteTransaction } = useFinanceStore();

  const toggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const applyPreset = (preset: typeof PRESET_SHIFTS[0]) => {
    setShiftTitle(preset.title);
    setStartTime(preset.startTime);
    setEndTime(preset.endTime);
  };

  const selectDoctorFromSaved = (doc: { name: string; specialty?: string }) => {
    setDoctorName(doc.name);
    setIsWritingNewDoctor(false);
    setShowDoctorDropdown(false);
    if (doc.specialty) {
      if (PRESET_SPECIALTIES.includes(doc.specialty)) {
        setSelectedSpecialty(doc.specialty);
      } else {
        setSelectedSpecialty("Otra (especificar)");
        setCustomSpecialty(doc.specialty);
      }
    }
  };

  const handleStartTimeChange = (event: any, pickedDate?: Date) => {
    if (Platform.OS === "android") setShowStartTimePicker(false);
    if (event.type === "dismissed") return;
    if (pickedDate) {
      setStartTime(dateTo12HourString(pickedDate));
    }
  };

  const handleEndTimeChange = (event: any, pickedDate?: Date) => {
    if (Platform.OS === "android") setShowEndTimePicker(false);
    if (event.type === "dismissed") return;
    if (pickedDate) {
      setEndTime(dateTo12HourString(pickedDate));
    }
  };

  const handleSave = () => {
    if (!doctorName.trim()) {
      dialog.alert("Campo requerido", "Por favor ingresa o selecciona el nombre del doctor especialista.", "error");
      return;
    }

    if (isRecurring && selectedDays.length === 0) {
      dialog.alert("Días de atención", "Selecciona al menos un día de la semana para atención recurrente.", "error");
      return;
    }

    const finalSpecialty =
      selectedSpecialty === "Otra (especificar)"
        ? customSpecialty.trim()
        : selectedSpecialty;

    const feeNumber = rentalFeeDisplay.trim() ? parseInputCOP(rentalFeeDisplay) : undefined;
    const targetDateStr = Platform.OS === "web" ? singleDateStr : toLocalDateString(singleDate);
    const blockDate = isRecurring ? new Date().toISOString() : (targetDateStr ? new Date(targetDateStr + "T12:00:00").toISOString() : new Date().toISOString());

    // Verificar conflicto con citas de pacientes
    const patientConflict = findPatientConflictForSpecialistBlock(
      {
        id: existingBlock?.id,
        date: isRecurring ? undefined : targetDateStr,
        isRecurring,
        recurringDays: isRecurring ? selectedDays : undefined,
        startTime,
        endTime,
      },
      patients
    );
    if (patientConflict) {
      dialog.alert(
        "Conflicto de horario",
        `El paciente ${patientConflict.patientName} tiene una cita a las ${patientConflict.appointmentTime} en ese mismo horario. Por favor elige otra hora o fecha.`,
        "error"
      );
      return;
    }

    // Construir descripción del ingreso
    const specialty = finalSpecialty || "Especialista";
    const feeDescription = `Consultorio – ${doctorName.trim()} (${specialty})`;

    if (existingBlock) {
      // Actualizar el bloque
      const updatedData: any = {
        doctorName: doctorName.trim(),
        specialty: finalSpecialty || undefined,
        shiftTitle: shiftTitle.trim() || "Bloque Especialista",
        isRecurring,
        recurringDays: isRecurring ? selectedDays : undefined,
        date: isRecurring ? undefined : targetDateStr,
        startTime,
        endTime,
        notes: notes.trim() || undefined,
        rentalFee: feeNumber,
      };

      // Actualizar / crear / eliminar la transacción de finanzas vinculada
      if (feeNumber && feeNumber > 0) {
        if (existingBlock.financeTransactionId) {
          // Ya existía: actualizar monto, descripción, procedimiento y categoría
          updateTransaction(existingBlock.financeTransactionId, {
            amount: feeNumber,
            description: feeDescription,
            procedure: feeDescription,
            category: "arriendo_consultorio",
          });
        } else {
          // No existía: crear nueva
          const txId = generateId();
          addTransaction({
            id: txId,
            type: "INCOME",
            amount: feeNumber,
            description: feeDescription,
            procedure: feeDescription,
            date: blockDate,
            category: "arriendo_consultorio",
          });
          updatedData.financeTransactionId = txId;
        }
      } else if (existingBlock.financeTransactionId) {
        // Se quitó el cobro: eliminar la transacción vinculada
        deleteTransaction(existingBlock.financeTransactionId);
        updatedData.financeTransactionId = undefined;
      }

      updateSpecialistBlock(existingBlock.id, updatedData);
      dialog.alert("Actualizado", "Bloque del especialista actualizado con éxito.", "success", () => {
        router.back();
      });
    } else {
      // Nuevo bloque
      const newBlockData: any = {
        doctorName: doctorName.trim(),
        specialty: finalSpecialty || undefined,
        shiftTitle: shiftTitle.trim() || "Bloque Especialista",
        isRecurring,
        recurringDays: isRecurring ? selectedDays : undefined,
        date: isRecurring ? undefined : targetDateStr,
        startTime,
        endTime,
        notes: notes.trim() || undefined,
        rentalFee: feeNumber,
      };

      // Crear transacción en finanzas si hay cobro
      if (feeNumber && feeNumber > 0) {
        const txId = generateId();
        addTransaction({
          id: txId,
          type: "INCOME",
          amount: feeNumber,
          description: feeDescription,
          procedure: feeDescription,
          date: blockDate,
          category: "arriendo_consultorio",
        });
        newBlockData.financeTransactionId = txId;
      }

      addSpecialistBlock(newBlockData);
      dialog.alert("Guardado", `Bloque de reserva para ${doctorName.trim()} guardado con éxito.`, "success", () => {
        router.back();
      });
    }
  };

  const handleDelete = () => {
    if (!existingBlock) return;
    dialog.confirm(
      "Eliminar Bloque",
      "¿Estás seguro de que deseas eliminar este bloque de horario del especialista?",
      () => {
        // Eliminar la transacción de finanzas vinculada (si existe)
        if (existingBlock.financeTransactionId) {
          deleteTransaction(existingBlock.financeTransactionId);
        }
        deleteSpecialistBlock(existingBlock.id);
        router.back();
      },
      "danger"
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {existingBlock ? "Editar Bloque Especialista" : "Reservar Bloque Doctor"}
          </Text>
          {existingBlock ? (
            <TouchableOpacity style={styles.deleteHeaderButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color={Colors.danger} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 32 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Dropdown de Doctor */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>Nombre del Doctor / Especialista *</Text>
            
            {savedDoctors.length > 0 && (
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setShowDoctorDropdown(!showDoctorDropdown)}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={18} color={Colors.primary} />
                <Text style={styles.dropdownSelectorText}>
                  {doctorName || "Seleccionar Doctor Guardado..."}
                </Text>
                <Ionicons
                  name={showDoctorDropdown ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            )}

            {/* Menú Desplegable de Doctores */}
            {showDoctorDropdown && (
              <View style={styles.dropdownMenu}>
                {savedDoctors.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.dropdownItem}
                    onPress={() => selectDoctorFromSaved(doc)}
                  >
                    <Ionicons name="person" size={16} color={Colors.primary} />
                    <Text style={styles.dropdownItemText}>{doc.name}</Text>
                    {doc.specialty ? (
                      <Text style={styles.dropdownItemSub}>({doc.specialty})</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.dropdownItem, { borderTopWidth: 1, borderTopColor: Colors.border }]}
                  onPress={() => {
                    setDoctorName("");
                    setIsWritingNewDoctor(true);
                    setShowDoctorDropdown(false);
                  }}
                >
                  <Ionicons name="create-outline" size={16} color={Colors.primary} />
                  <Text style={[styles.dropdownItemText, { color: Colors.primary, fontWeight: "700" }]}>
                    + Escribir nuevo doctor
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Campo de Texto para Escribir / Modificar Nombre del Doctor */}
            {(savedDoctors.length === 0 || isWritingNewDoctor || showDoctorDropdown) && (
              <View style={{ marginTop: 8 }}>
                <FormInput
                  label=""
                  placeholder="Escribe el nombre del doctor"
                  value={doctorName}
                  onChangeText={(val) => {
                    setDoctorName(val);
                    setIsWritingNewDoctor(true);
                  }}
                />
              </View>
            )}
          </View>

          {/* Dropdown de Especialidad */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>Especialidad del Doctor</Text>
            
            <TouchableOpacity
              style={styles.dropdownSelector}
              onPress={() => setShowSpecialtyDropdown(!showSpecialtyDropdown)}
              activeOpacity={0.8}
            >
              <Ionicons name="ribbon-outline" size={18} color={Colors.primary} />
              <Text style={styles.dropdownSelectorText}>{selectedSpecialty}</Text>
              <Ionicons
                name={showSpecialtyDropdown ? "chevron-up" : "chevron-down"}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Menú Desplegable de Especialidades */}
            {showSpecialtyDropdown && (
              <View style={styles.dropdownMenu}>
                {PRESET_SPECIALTIES.map((spec) => (
                  <TouchableOpacity
                    key={spec}
                    style={[
                      styles.dropdownItem,
                      selectedSpecialty === spec && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setSelectedSpecialty(spec);
                      setShowSpecialtyDropdown(false);
                    }}
                  >
                    <Ionicons
                      name={selectedSpecialty === spec ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={selectedSpecialty === spec ? Colors.primary : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedSpecialty === spec && styles.dropdownItemTextActive,
                      ]}
                    >
                      {spec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Campo Libre para "Otra (especificar)" */}
            {selectedSpecialty === "Otra (especificar)" && (
              <View style={{ marginTop: 8 }}>
                <FormInput
                  label="Escribe la especialidad *"
                  placeholder="ej. Cirugía Oral, Odontopediatría Integral"
                  value={customSpecialty}
                  onChangeText={setCustomSpecialty}
                />
              </View>
            )}
          </View>

          {/* Presets Rápidos de Turnos */}
          <Text style={styles.sectionLabel}>Turnos Rápidos</Text>
          <View style={styles.presetRow}>
            {PRESET_SHIFTS.map((preset) => (
              <TouchableOpacity
                key={preset.title}
                style={[
                  styles.presetChip,
                  shiftTitle === preset.title && styles.presetChipActive,
                ]}
                onPress={() => applyPreset(preset)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    shiftTitle === preset.title && styles.presetChipTextActive,
                  ]}
                >
                  {preset.title}
                </Text>
                <Text style={styles.presetChipSub}>
                  {preset.startTime} - {preset.endTime}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Selección de Horas — Reloj tipo Rueda (igual al celular), web y móvil */}
          <Text style={styles.sectionLabel}>Horas de Cita (Formato 12H AM/PM)</Text>
          <View style={styles.timeRow}>
            {/* Hora Inicio */}
            <TouchableOpacity
              style={[styles.timeBox, { flex: 1 }]}
              onPress={() => setTimePickerTarget("start")}
              activeOpacity={0.75}
            >
              <Text style={styles.timeBoxLabel}>⏱ Hora Inicio</Text>
              <View style={styles.timeValueRow}>
                <Ionicons name="time-outline" size={18} color={Colors.primary} />
                <Text style={styles.timeBoxValue}>{startTime}</Text>
                <Ionicons name="chevron-down" size={14} color={Colors.primary} />
              </View>
            </TouchableOpacity>

            {/* Hora Fin */}
            <TouchableOpacity
              style={[styles.timeBox, { flex: 1 }]}
              onPress={() => setTimePickerTarget("end")}
              activeOpacity={0.75}
            >
              <Text style={styles.timeBoxLabel}>⏹ Hora Fin</Text>
              <View style={styles.timeValueRow}>
                <Ionicons name="time-outline" size={18} color={Colors.primary} />
                <Text style={styles.timeBoxValue}>{endTime}</Text>
                <Ionicons name="chevron-down" size={14} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Modal de Rueda tipo Celular — para ambos campos */}
          <TimePickerModal
            visible={timePickerTarget !== null}
            initialTime={timePickerTarget === "start" ? startTime : endTime}
            title={timePickerTarget === "start" ? "Hora de Inicio" : "Hora de Fin"}
            onConfirm={(t) => {
              if (timePickerTarget === "start") setStartTime(t);
              else setEndTime(t);
              setTimePickerTarget(null);
            }}
            onCancel={() => setTimePickerTarget(null)}
          />

          {/* Switch Recurrente vs Fecha Única (Apagado por defecto) */}
          <View style={styles.switchCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Atención Recurrente Semanal</Text>
              <Text style={styles.switchSub}>
                {isRecurring
                  ? "Se repite habitualmente en los días seleccionados"
                  : "Aplica únicamente para una fecha específica"}
              </Text>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: "#D1D5DB", true: Colors.primary + "40" }}
              thumbColor={isRecurring ? Colors.primary : "#F3F4F6"}
            />
          </View>

          {/* Días de la semana (si es recurrente) */}
          {isRecurring ? (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Días de la Semana que Atiende</Text>
              <View style={styles.daysContainer}>
                {DAYS_OF_WEEK.map((day) => {
                  const active = selectedDays.includes(day.id);
                  return (
                    <TouchableOpacity
                      key={day.id}
                      style={[styles.dayCircle, active && styles.dayCircleActive]}
                      onPress={() => toggleDay(day.id)}
                    >
                      <Text
                        style={[styles.dayText, active && styles.dayTextActive]}
                      >
                        {day.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            /* Selector de fecha única */
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Fecha Específica</Text>
              {Platform.OS === "web" ? (
                <View style={styles.datePickerButton}>
                  <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                  <TextInput
                    style={[styles.webInputText, { fontSize: 14 }]}
                    value={singleDateStr}
                    onChangeText={setSingleDateStr}
                    placeholder="AAAA-MM-DD"
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                  <Text style={styles.datePickerText}>
                    {singleDate.toLocaleDateString("es-ES", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>
              )}

              {Platform.OS !== "web" && showDatePicker && (
                <DateTimePicker
                  value={singleDate}
                  mode="date"
                  display="default"
                  onChange={(event, picked) => {
                    if (Platform.OS === "android") setShowDatePicker(false);
                    if (picked) {
                      setSingleDate(picked);
                      setSingleDateStr(toLocalDateString(picked));
                    }
                  }}
                />
              )}
            </View>
          )}

          {/* Alquiler / Cobro Consultorio (Opcional) */}
          <FormInput
            label="Cobro por Uso del Consultorio "
            placeholder="ej. 150.000"
            value={rentalFeeDisplay}
            onChangeText={(text) => setRentalFeeDisplay(formatInputCOP(text))}
            keyboardType="numeric"
          />

          {/* Notas */}
          <FormInput
            label="Notas u Observaciones"
            placeholder=" "
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          {/* Botón de Acción */}
          <View style={{ marginTop: 16, marginBottom: 32 }}>
            <PrimaryButton
              label={existingBlock ? "Guardar Cambios" : "Guardar Bloque de Especialista"}
              onPress={handleSave}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.card || "white",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 6,
  },
  deleteHeaderButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  sectionContainer: {
    marginVertical: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  dropdownSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card || "white",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownSelectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginLeft: 10,
  },
  dropdownMenu: {
    backgroundColor: Colors.card || "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "40",
  },
  dropdownItemActive: {
    backgroundColor: Colors.primary + "15",
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  dropdownItemTextActive: {
    fontWeight: "700",
    color: Colors.primary,
  },
  dropdownItemSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  presetChip: {
    backgroundColor: Colors.card || "white",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    minWidth: "45%",
  },
  presetChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "15",
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  presetChipTextActive: {
    color: Colors.primary,
  },
  presetChipSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 4,
  },
  timeBoxContainer: {
    flex: 1,
    position: "relative",
  },
  timeBox: {
    backgroundColor: Colors.card || "white",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
  },
  timeBoxLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  timeValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeBoxValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  dropdownTimeMenu: {
    backgroundColor: Colors.card || "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 20,
  },
  dropdownTimeItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "40",
  },
  webInputText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    flex: 1,
    padding: 0,
  },
  switchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card || "white",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 4,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  switchSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.card || "white",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  dayTextActive: {
    color: "#FFFFFF",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.card || "white",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
  },
  datePickerText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    textTransform: "capitalize",
  },
});
