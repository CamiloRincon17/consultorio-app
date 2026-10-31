import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors, useThemedStyles, type Palette } from '../shared/theme';
import { useFinanceStore } from '../features/finance/store';
import { FormInput, PrimaryButton } from '../shared/components';
import { useDialog } from '../shared/context/DialogContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

/** Formatea número como 150.000 al tipear */
function formatInputCOP(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('es-CO');
}
/** Convierte "150.000" a 150000 */
function parseInputCOP(formatted: string): number {
  return parseFloat(formatted.replace(/\./g, '').replace(/,/g, '.') || '0') || 0;
}
export default function AddTransaction() {
    const router = useRouter();
    const addTransaction = useFinanceStore((s) => s.addTransaction);
    const dialog = useDialog();
    const colors = useColors();
    const styles = useThemedStyles(createStyles);

    const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [amountDisplay, setAmountDisplay] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const handleSave = () => {
        if (!amountDisplay.trim()) {
            dialog.alert('Error', 'El monto es obligatorio', 'error');
            return;
        }
        if (!description.trim()) {
            dialog.alert('Error', 'La descripción es obligatoria', 'error');
            return;
        }

        addTransaction({
            type,
            amount: parseInputCOP(amountDisplay),
            description,
            date: date.toISOString(),
        });

        router.back();
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.form}>
                <View style={styles.segmentedContainer}>
                    <TouchableOpacity
                        style={[styles.segment, type === 'INCOME' && styles.segmentActiveIncome]}
                        onPress={() => setType('INCOME')}
                    >
                        <Text style={[styles.segmentText, type === 'INCOME' && styles.segmentTextActive]}>Ingreso</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segment, type === 'EXPENSE' && styles.segmentActiveExpense]}
                        onPress={() => setType('EXPENSE')}
                    >
                        <Text style={[styles.segmentText, type === 'EXPENSE' && styles.segmentTextActive]}>Gasto</Text>
                    </TouchableOpacity>
                </View>

                <FormInput
                    label="Monto (COP)"
                    style={[styles.amountInput, { color: type === 'INCOME' ? colors.success : colors.danger }]}
                    placeholder="ej. 150.000"
                    keyboardType="numeric"
                    value={amountDisplay}
                    onChangeText={(text) => setAmountDisplay(formatInputCOP(text))}
                    autoFocus
                />

                <FormInput
                    label="Descripción"
                    placeholder="Ej. Pago de Ortodoncia"
                    value={description}
                    onChangeText={setDescription}
                />

                <View style={styles.datePickerContainer}>
                    <Text style={styles.dateLabel}>Fecha del Movimiento</Text>
                    <TouchableOpacity 
                        style={styles.dateSelector}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
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

                <PrimaryButton
                    label={`Guardar ${type === 'INCOME' ? 'Ingreso' : 'Gasto'}`}
                    variant={type === 'INCOME' ? 'success' : 'danger'}
                    onPress={handleSave}
                />
            </View>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: Palette) =>
    StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    form: {
        padding: 24,
        gap: 24,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 4,
    },
    segment: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    segmentActiveIncome: {
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    segmentActiveExpense: {
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    segmentText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    segmentTextActive: {
        color: colors.text,
    },
    amountInput: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    datePickerContainer: {
        marginBottom: 8,
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
        padding: 16,
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
    },
    dateText: {
        fontSize: 16,
        color: colors.text,
        textTransform: 'capitalize',
    }
});
