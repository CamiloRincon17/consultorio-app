import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useApp } from '../context/AppContext';

export default function EditPatient() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { patients, updatePatient, deletePatient } = useApp();

    // Convertir id a string si es un array (expo-router a veces hace esto)
    const patientId = Array.isArray(id) ? id[0] : id;
    const patient = patientId ? patients.find(p => p.id === patientId) : undefined;

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [monthlyFee, setMonthlyFee] = useState('');
    const [notes, setNotes] = useState('');

    // Actualizar el estado cuando cambia el paciente
    useEffect(() => {
        if (patient) {
            setName(patient.name);
            setPhone(patient.phone);
            setMonthlyFee(patient.monthlyFee.toString());
            setNotes(patient.notes || '');
        }
    }, [patient]);

    // También actualizar cuando la pantalla obtiene el foco
    useFocusEffect(
        useCallback(() => {
            if (patient) {
                setName(patient.name);
                setPhone(patient.phone);
                setMonthlyFee(patient.monthlyFee.toString());
                setNotes(patient.notes || '');
            }
        }, [patient])
    );

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

    if (!patient) return (
        <View style={styles.container}>
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Cargando paciente...</Text>
            </View>
        </View>
    );

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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
