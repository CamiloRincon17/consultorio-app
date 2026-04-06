import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../shared/constants/Colors';
import { useApp } from '../context/AppContext';
import { FormInput, PrimaryButton } from '../shared/components';
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
    const [appointmentDay, setAppointmentDay] = useState('');

    // Actualizar el estado cuando cambia el paciente
    useEffect(() => {
        if (patient) {
            setName(patient.name);
            setPhone(patient.phone);
            setMonthlyFee(patient.monthlyFee.toString());
            setNotes(patient.notes || '');
            setAppointmentDay(patient.appointmentDay ? patient.appointmentDay.toString() : '');
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
                setAppointmentDay(patient.appointmentDay ? patient.appointmentDay.toString() : '');
            }
        }, [patient])
    );

    const handleSave = () => {
        if (!name.trim() || !monthlyFee.trim()) {
            Alert.alert('Error', 'Nombre y Cuota son obligatorios');
            return;
        }

        // Check for duplicate names (excluding the current patient)
        const duplicateName = patients.find(
            (p) => p.id !== patient!.id && p.name.toLowerCase().trim() === name.toLowerCase().trim()
        );
        if (duplicateName) {
            Alert.alert(
                'Nombre Duplicado',
                'Ya existe otro paciente con este nombre. Por favor, agrega algo único (ej. apellido completo, inicial, etc.)'
            );
            return;
        }

        updatePatient(patient!.id, {
            name,
            phone,
            monthlyFee: parseFloat(monthlyFee),
            notes,
            ...(patient!.treatmentType === 'ortodoncia' && appointmentDay ? { appointmentDay: parseInt(appointmentDay, 10) } : {})
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
                <FormInput
                    label="Nombre Completo"
                    value={name}
                    onChangeText={setName}
                    placeholder="Nombre del paciente"
                />

                <FormInput
                    label="Teléfono"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Num. Celular"
                    keyboardType="phone-pad"
                />

                <FormInput
                    label="Cuota Mensual ($)"
                    value={monthlyFee}
                    onChangeText={setMonthlyFee}
                    placeholder="0.00"
                    keyboardType="numeric"
                />
                {patient.treatmentType === 'ortodoncia' && (
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
                )}
                <FormInput
                    label="Notas / Antecedentes"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Alergias, condiciones, etc."
                    multiline
                    numberOfLines={4}
                    style={styles.textArea}
                />

                <PrimaryButton 
                    label="Guardar Cambios" 
                    onPress={handleSave} 
                />

                <PrimaryButton 
                    label="Eliminar Paciente" 
                    onPress={handleDelete} 
                    variant="danger" 
                    style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.danger }}
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
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    }
});
