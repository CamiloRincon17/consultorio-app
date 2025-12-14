import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useApp } from '../context/AppContext';

export default function EditPatient() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { patients, updatePatient, deletePatient } = useApp();

    const patient = patients.find(p => p.id === id);

    const [name, setName] = useState(patient?.name || '');
    const [phone, setPhone] = useState(patient?.phone || '');
    const [monthlyFee, setMonthlyFee] = useState(patient?.monthlyFee.toString() || '');
    const [notes, setNotes] = useState(patient?.notes || '');

    const handleSave = () => {
        if (!name.trim() || !monthlyFee.trim()) {
            Alert.alert('Error', 'Nombre y Cuota son obligatorios');
            return;
        }

        updatePatient(patient!.id, {
            name,
            phone,
            monthlyFee: parseFloat(monthlyFee),
            notes,
        });

        Alert.alert('Éxito', 'Datos del paciente actualizados');
        router.back();
    };

    const handleDelete = () => {
        Alert.alert(
            'Eliminar Paciente',
            '¿Estás seguro? Esto borrará al paciente pero mantendrá su historial financiero.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => {
                        deletePatient(patient!.id);
                        router.replace('/(tabs)/pacientes');
                    }
                }
            ]
        );
    };

    if (!patient) return <View><Text>Paciente no encontrado</Text></View>;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nombre Completo</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Nombre del paciente"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Teléfono</Text>
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Num. Celular"
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Cuota Mensual ($)</Text>
                    <TextInput
                        style={styles.input}
                        value={monthlyFee}
                        onChangeText={setMonthlyFee}
                        placeholder="0.00"
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Notas / Antecedentes</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Alergias, condiciones, etc."
                        multiline
                        numberOfLines={4}
                    />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>Eliminar Paciente</Text>
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
    textArea: {
        height: 100,
        textAlignVertical: 'top',
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
