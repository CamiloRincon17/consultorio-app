import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { Patient, useApp } from '../context/AppContext';
import { formatCOPShort } from '../utils/formatCOP';

export default function RegisterPayment() {
    const router = useRouter();
    const { patients, addTransaction } = useApp();

    const [isRegistered, setIsRegistered] = useState(true);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [anonymousName, setAnonymousName] = useState('');

    const [amount, setAmount] = useState('');
    const [procedure, setProcedure] = useState('');
    const [description, setDescription] = useState('Consulta/Tratamiento');

    const [showPatientPicker, setShowPatientPicker] = useState(false);

    const selectedPatient = useMemo(() =>
        patients.find(p => p.id === selectedPatientId),
        [patients, selectedPatientId]
    );

    const handleSelectPatient = (patient: Patient) => {
        setSelectedPatientId(patient.id);
        setAmount(patient.monthlyFee.toString());
        setProcedure('Control Mensual');
        setShowPatientPicker(false);
    };

    const handleSave = () => {
        const finalPatientName = isRegistered ? selectedPatient?.name : anonymousName;

        if (isRegistered && !selectedPatientId) {
            Alert.alert('Error', 'Debes seleccionar un paciente registrado');
            return;
        }
        if (!isRegistered && !anonymousName.trim()) {
            Alert.alert('Error', 'Debes ingresar el nombre del paciente');
            return;
        }
        if (!amount.trim()) {
            Alert.alert('Error', 'El monto es obligatorio');
            return;
        }

        addTransaction({
            type: 'INCOME',
            amount: parseFloat(amount),
            description: description,
            patientName: finalPatientName,
            patientId: isRegistered ? selectedPatientId! : undefined,
            procedure: procedure,
            date: new Date().toISOString(),
        });

        router.back();
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.form}>

                <View style={styles.switchContainer}>
                    <Text style={styles.label}>¿Paciente Registrado?</Text>
                    <Switch
                        value={isRegistered}
                        onValueChange={setIsRegistered}
                        trackColor={{ false: Colors.border, true: Colors.success }}
                    />
                </View>

                {isRegistered ? (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Seleccionar Paciente</Text>
                        <TouchableOpacity
                            style={styles.selector}
                            onPress={() => setShowPatientPicker(true)}
                        >
                            <Text style={selectedPatient ? styles.selectorText : styles.placeholderText}>
                                {selectedPatient ? selectedPatient.name : 'Buscar en lista...'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nombre del Paciente</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej. Cliente Ocasional"
                            value={anonymousName}
                            onChangeText={setAnonymousName}
                        />
                    </View>
                )}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Procedimiento / Motivo</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej. Limpieza, Extracción, Control"
                        value={procedure}
                        onChangeText={setProcedure}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Monto a Cobrar (COP)</Text>
                    <TextInput
                        style={[styles.input, styles.amountInput]}
                        placeholder="0"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nota Adicional</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Detalles opcionales..."
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleSave}
                >
                    <Text style={styles.buttonText}>Registrar Ingreso</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Patient Picker Modal */}
            <Modal visible={showPatientPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Seleccionar Paciente</Text>
                            <TouchableOpacity onPress={() => setShowPatientPicker(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.patientList}>
                            {patients.map(patient => (
                                <TouchableOpacity
                                    key={patient.id}
                                    style={styles.patientItem}
                                    onPress={() => handleSelectPatient(patient)}
                                >
                                    <Text style={styles.patientItemName}>{patient.name}</Text>
                                    <Text style={styles.patientItemDetail}>Cuota: {formatCOPShort(patient.monthlyFee)}</Text>
                                </TouchableOpacity>
                            ))}
                            {patients.length === 0 && (
                                <Text style={styles.emptyText}>No hay pacientes registrados.</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    selector: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectorText: {
        fontSize: 16,
        color: Colors.text,
    },
    placeholderText: {
        fontSize: 16,
        color: Colors.textSecondary,
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
        color: Colors.success,
    },
    button: {
        backgroundColor: Colors.success,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#F2F2F7',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    patientList: {
        padding: 16,
    },
    patientItem: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    patientItemName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    patientItemDetail: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    emptyText: {
        textAlign: 'center',
        color: Colors.textSecondary,
        marginTop: 20,
    }
});
