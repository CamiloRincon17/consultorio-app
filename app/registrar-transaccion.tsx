import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useApp } from '../context/AppContext';

export default function AddTransaction() {
    const router = useRouter();
    const { addTransaction } = useApp();

    const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

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
            date: new Date().toISOString(),
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

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Monto ($)</Text>
                    <TextInput
                        style={[styles.input, styles.amountInput, { color: type === 'INCOME' ? Colors.success : Colors.danger }]}
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                        autoFocus
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descripción</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej. Pago de Ortodoncia"
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: type === 'INCOME' ? Colors.success : Colors.danger }]}
                    onPress={handleSave}
                >
                    <Text style={styles.buttonText}>Guardar {type === 'INCOME' ? 'Ingreso' : 'Gasto'}</Text>
                </TouchableOpacity>
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
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    input: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    amountInput: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    button: {
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
