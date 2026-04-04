import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../shared/constants/Colors';
import { useApp } from '../context/AppContext';
import { FormInput, PrimaryButton } from '../shared/components';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

export default function AddTransaction() {
    const router = useRouter();
    const { addTransaction } = useApp();

    const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleSave = () => {
        if (!amount.trim()) {
            Alert.alert('Error', 'El monto es obligatorio');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Error', 'La descripción es obligatoria');
            return;
        }

        addTransaction({
            type,
            amount: parseFloat(amount),
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
                    style={[styles.amountInput, { color: type === 'INCOME' ? Colors.success : Colors.danger }]}
                    placeholder="0"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
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

                <PrimaryButton
                    label={`Guardar ${type === 'INCOME' ? 'Ingreso' : 'Gasto'}`}
                    variant={type === 'INCOME' ? 'success' : 'danger'}
                    onPress={handleSave}
                />
            </View>
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
        gap: 24,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: '#E5E5EA',
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
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    segmentActiveExpense: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    segmentText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    segmentTextActive: {
        color: Colors.text,
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
