import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { Colors } from "../shared/constants/Colors";
import { useApp } from "../context/AppContext";
import { FormInput, PrimaryButton } from "../shared/components";
import { useDialog } from "../shared/context/DialogContext";
import { formatInputCOP, parseInputCOP } from "../shared/utils/formatCOP";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

export default function EditTransaction() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { transactions, updateTransaction, deleteTransaction } = useApp();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();

  // Convertir id a string si es un array (expo-router a veces hace esto)
  const transactionId = Array.isArray(id) ? id[0] : id;
  const transaction = transactionId
    ? transactions.find((t) => t.id === transactionId)
    : undefined;

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [procedure, setProcedure] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Actualizar el estado cuando cambia la transacción
  useEffect(() => {
    if (transaction) {
      setAmount(formatInputCOP(transaction.amount ?? 0));
      setDescription(transaction.description);
      setProcedure(transaction.procedure || "");
      if (transaction.date) {
        setDate(new Date(transaction.date));
      }
    }
  }, [transaction]);

  // También actualizar cuando la pantalla obtiene el foco
  useFocusEffect(
    useCallback(() => {
      if (transaction) {
        setAmount(formatInputCOP(transaction.amount ?? 0));
        setDescription(transaction.description);
        setProcedure(transaction.procedure || "");
        if (transaction.date) {
          setDate(new Date(transaction.date));
        }
      }
    }, [transaction]),
  );

  const handleSave = () => {
    if (!amount.trim()) {
      dialog.alert("Error", "El monto es obligatorio", "error");
      return;
    }

    updateTransaction(transaction!.id, {
      amount: parseInputCOP(amount),
      description,
      procedure,
      date: date.toISOString(),
    });

    dialog.alert("Éxito", "Transacción actualizada", "success", () => router.back());
  };

  const handleDelete = () => {
    dialog.confirm(
      "Eliminar Transacción",
      "¿Estás seguro de eliminar este registro?",
      () => {
        deleteTransaction(transaction!.id);
        router.back();
      },
      "danger"
    );
  };

  if (!transaction)
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando transacción...</Text>
        </View>
      </View>
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {transaction.type === "INCOME" ? "Ingreso" : "Gasto"}
          </Text>
        </View>

        <FormInput
          label="Monto (COP)"
          style={styles.amountInput}
          value={amount}
          onChangeText={(val) => setAmount(formatInputCOP(val))}
          placeholder="ej. 150.000"
          keyboardType="numeric"
        />

        <FormInput
          label="Descripción / Concepto"
          value={description}
          onChangeText={setDescription}
          placeholder="Consulta..."
        />

        {transaction.type === "INCOME" && (
          <FormInput
            label="Procedimiento"
            value={procedure}
            onChangeText={setProcedure}
            placeholder="Limpieza, etc."
          />
        )}

        <View style={styles.datePickerContainer}>
          <Text style={styles.dateLabel}>Fecha del Movimiento</Text>
          <TouchableOpacity 
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            <Text style={styles.dateText}>
              {date.toLocaleDateString("es-ES", { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
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

        <PrimaryButton label="Guardar Cambios" onPress={handleSave} />

        <PrimaryButton
          label="Eliminar Registro"
          onPress={handleDelete}
          variant="danger"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  form: {
    padding: 24,
    gap: 20,
  },
  header: {
    marginBottom: 10,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary,
    textAlign: "center",
  },
  datePickerContainer: {
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: Colors.text,
    textTransform: 'capitalize',
  }
});
