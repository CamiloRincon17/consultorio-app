import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
} from "react-native";
import { useColors, useThemedStyles, type Palette } from "../shared/theme";
import { useFinanceStore } from "../features/finance/store";
import { FormInput, PrimaryButton, PhotoGallery } from "../shared/components";
import { useDialog } from "../shared/context/DialogContext";
import { formatInputCOP, parseInputCOP } from "../shared/utils/formatCOP";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { usePatientsStore } from "../features/patients/store";
import { Transaction } from "../features/finance/types";
import { Patient, Visit } from "../features/patients/types";

interface EditTransactionFormProps {
  Transaction: Transaction;
  linkedPatient?: Patient;
  linkedVisit?: Visit;
}

function EditTransactionForm({
  Transaction,
  linkedPatient,
  linkedVisit,
}: EditTransactionFormProps) {
  const router = useRouter();
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  const updateVisit = usePatientsStore((s) => s.updateVisit);
  const addVisit = usePatientsStore((s) => s.addVisit);

  const [amount, setAmount] = useState(() => formatInputCOP(Transaction.amount ?? 0));
  const [description, setDescription] = useState(Transaction.description || "");
  const [procedure, setProcedure] = useState(Transaction.procedure || "");
  const [date, setDate] = useState(() =>
    Transaction.date ? new Date(Transaction.date) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photos, setPhotos] = useState<string[]>(
    () => linkedVisit?.photos || Transaction.photos || []
  );

  const handleSave = () => {
    if (!amount.trim()) {
      dialog.alert("Error", "El monto es obligatorio", "error");
      return;
    }

    updateTransaction(Transaction.id, {
      amount: parseInputCOP(amount),
      description,
      procedure,
      date: date.toISOString(),
      photos: photos.length > 0 ? photos : undefined,
    });

    // Si tiene un paciente asociado, sincronizar las fotos en su visita
    if (linkedPatient) {
      if (linkedVisit) {
        updateVisit(linkedPatient.id, linkedVisit.id, {
          photos: photos.length > 0 ? photos : undefined,
          reason: procedure || linkedVisit.reason,
          treatment: description || linkedVisit.treatment,
        });
      } else if (photos.length > 0) {
        // Crear visita vinculada si no existía y se agregaron fotos
        addVisit(linkedPatient.id, {
          date: date.toISOString().split('T')[0],
          reason: procedure || 'Procedimiento registrado',
          treatment: description || 'Pago de Procedimiento',
          cost: parseInputCOP(amount),
          paid: true,
          transactionId: Transaction.id,
          photos: photos,
        });
      }
    }

    dialog.alert("Éxito", "transacción actualizada", "success", () => router.back());
  };

  const handleDelete = () => {
    dialog.confirm(
      "Eliminar transacción",
      "¿Estás seguro de eliminar este registro?",
      () => {
        deleteTransaction(Transaction.id);
        router.back();
      },
      "danger"
    );
  };

  const isIncome = Transaction.type === "INCOME";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header fijo con botón de volver */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Editar transacción</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Encabezado con tipo de transacción */}
        <View style={styles.header}>
          <View
            style={[
              styles.badge,
              { backgroundColor: isIncome ? "#DCFCE7" : "#FEE2E2" },
            ]}
          >
            <Ionicons
              name={isIncome ? "arrow-down-circle" : "arrow-up-circle"}
              size={16}
              color={isIncome ? "#16A34A" : "#DC2626"}
            />
            <Text
              style={[
                styles.badgeText,
                { color: isIncome ? "#16A34A" : "#DC2626" },
              ]}
            >
              {isIncome ? "Ingreso" : "Gasto"}
            </Text>
          </View>
        </View>

        {/* Tarjeta de monto */}
        <View style={styles.amountCard}>
          <Text style={styles.amountCardLabel}>Monto (COP)</Text>
          <FormInput
            style={styles.amountInput}
            value={amount}
            onChangeText={(val) => setAmount(formatInputCOP(val))}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>

        {/* Tarjeta de detalles */}
        <View style={styles.detailsCard}>
          <FormInput
            label="descripción / Concepto"
            value={description}
            onChangeText={setDescription}
            placeholder="Consulta..."
          />

          {isIncome && (
            <FormInput
              label="Procedimiento"
              value={procedure}
              onChangeText={setProcedure}
              placeholder="Limpieza, etc."
              style={{ marginTop: 16 }}
            />
          )}

          <View style={styles.datePickerContainer}>
            <Text style={styles.dateLabel}>fecha del movimiento</Text>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dateIconWrap}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <Text style={styles.dateText}>
                {date.toLocaleDateString("es-ES", { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
          </View>
        </View>

        {/* Tarjeta de Fotografías del Procedimiento */}
        <View style={styles.detailsCard}>
          <PhotoGallery
            photos={photos}
            onAddPhoto={(newUrl) => setPhotos((prev) => [...prev, newUrl])}
            onDeletePhoto={(delUrl) => setPhotos((prev) => prev.filter((p) => p !== delUrl))}
            patientId={Transaction.patientId || ''}
            title="Fotografías del Procedimiento"
          />
        </View>

        {/* Acciones */}
        <View style={styles.Actions}>
          <PrimaryButton style={styles.saveButton} label="Guardar cambios" onPress={handleSave} />

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
            <Text style={styles.deleteButtonText}>Eliminar registro</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function EditTransaction() {
  const { id } = useLocalSearchParams();
  const transactions = useFinanceStore((s) => s.transactions);
  const patients = usePatientsStore((s) => s.patients);
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  // Convertir id a string si es un array
  const transactionId = Array.isArray(id) ? id[0] : id;
  const Transaction = transactionId
    ? transactions.find((t) => t.id === transactionId)
    : undefined;

  // Buscar paciente y visita asociada si aplica
  const linkedPatient = Transaction?.patientId
    ? patients.find((p) => p.id === Transaction.patientId)
    : undefined;
  const linkedVisit = linkedPatient?.visits?.find(
    (v) => (Transaction?.visitId && v.id === Transaction.visitId) || v.transactionId === Transaction?.id
  );

  if (!Transaction) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando transacción...</Text>
        </View>
      </View>
    );
  }

  return (
    <EditTransactionForm
      key={Transaction.id}
      Transaction={Transaction}
      linkedPatient={linkedPatient}
      linkedVisit={linkedVisit}
    />
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },

  form: {
    padding: 20,
    gap: 16,
  },

  // Type badge
  header: {
    alignItems: "center",
    marginBottom: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Amount card
  amountCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  amountCardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
  },

  // Details card
  detailsCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    gap: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },

  // Date picker
  datePickerContainer: {
    marginTop: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  dateIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    textTransform: 'capitalize',
  },

  // Actions
  Actions: {
    marginTop: 8,
    gap: 12,
  },
  saveButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
});
