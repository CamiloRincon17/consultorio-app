import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useApp } from '../context/AppContext';

export default function EditTransaction() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { transactions, updateTransaction, deleteTransaction } = useApp();

    const transaction = transactions.find(t => t.id === id);

    const [amount, setAmount] = useState(transaction?.amount.toString() || '');
    const [description, setDescription] = useState(transaction?.description || '');
    const [procedure, setProcedure] = useState(transaction?.procedure || '');

    const handleSave = () => {
        if (!amount.trim()) {
            Alert.alert('Error', 'El monto es obligatorio');
            return;
        }

        updateTransaction(transaction!.id, {
            amount: parseFloat(amount),
            description,
            procedure,
        });

        Alert.alert('Éxito', 'Transacción actualizada');
        router.back();
    };

    const handleDelete = () => {
        Alert.alert(
            'Eliminar Transacción',
            '¿Estás seguro de eliminar este registro?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => {
                        deleteTransaction(transaction!.id);
                        router.back();
                    }
                }
            ]
        );
    };

    if (!transaction) return <View><Text>Transacción no encontrada</Text></View>;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.form}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>
                        {transaction.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {new Date(transaction.date).toLocaleDateString()}
                    </Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Monto ($)</Text>
                    <TextInput
                        style={[styles.input, styles.amountInput]}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0.00"
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descripción / Concepto</Text>
                    <TextInput
                        style={styles.input}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Consulta..."
                    />
                </View>

                {transaction.type === 'INCOME' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Procedimiento</Text>
                        <TextInput
                            style={styles.input}
                            value={procedure}
                            onChangeText={setProcedure}
                            placeholder="Limpieza, etc."
                        />
                    </View>
                )}

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>Eliminar Registro</Text>
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
    header: {
        marginBottom: 10,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text,
    },
    headerSubtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
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
        borderWidth: 1,
        borderColor: Colors.border,
        fontSize: 16,
    },
    amountInput: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primary,
        textAlign: 'center',
    },
    saveButton: {
        backgroundColor: Colors.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    deleteButton: {
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        borderWidth: 1,
        borderColor: Colors.danger,
    },
    deleteButtonText: {
        color: Colors.danger,
        fontSize: 16,
        fontWeight: 'bold',
    }
});
