import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../shared/constants/Colors';
import { FormInput, PrimaryButton } from '../shared/components';
import { Patient, useApp } from '../context/AppContext';
import { formatCOPShort } from '../shared/utils/formatCOP';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function RegisterPayment() {
    const router = useRouter();
    const { patients, addTransaction, addVisit } = useApp();

    const [isRegistered, setIsRegistered] = useState(true);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [anonymousName, setAnonymousName] = useState('');

    const [amount, setAmount] = useState('');
    const [procedure, setProcedure] = useState('');
    const [isCustomProcedure, setIsCustomProcedure] = useState(false);
    const [description, setDescription] = useState('Consulta/Tratamiento');

    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [showPatientPicker, setShowPatientPicker] = useState(false);

    const selectedPatient = useMemo(() =>
        patients.find(p => p.id === selectedPatientId),
        [patients, selectedPatientId]
    );

    const handleSelectPatient = (patient: Patient) => {
        setSelectedPatientId(patient.id);
        setAmount(patient.monthlyFee.toString());
        setProcedure('Control Mensual');
        setIsCustomProcedure(false);
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

        const dateString = date.toISOString();
        const numericAmount = parseFloat(amount);

        if (isRegistered && selectedPatientId) {
            // Para pacientes registrados, addVisit creará automáticamente la transacción vinculada
            addVisit(selectedPatientId, {
                date: dateString.split('T')[0], // YYYY-MM-DD
                reason: procedure || 'Consulta General',
                treatment: description || 'Pago registrado',
                cost: numericAmount,
                paid: true,
                notes: 'Generado automáticamente desde Registrar Pago'
            });
        } else {
            // Para pacientes anónimos, solo crear transacción (sin visita)
            addTransaction({
                type: 'INCOME',
                amount: numericAmount,
                description: description || 'Pago registrado',
                patientName: finalPatientName,
                patientId: undefined,
                procedure: procedure || 'Consulta General',
                date: dateString,
            });
        }

        Alert.alert(
            "✅ Pago Registrado",
            "El pago se ha registrado exitosamente.",
            [{ text: "OK", onPress: () => router.back() }]
        );
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
                    <FormInput
                        label="Nombre del Paciente"
                        placeholder="Ej. Cliente Ocasional"
                        value={anonymousName}
                        onChangeText={setAnonymousName}
                    />
                )}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Procedimiento / Motivo</Text>
                    <View style={styles.optionsContainer}>
                        {['Limpieza', 'Extracción', 'Control', 'Ortodoncia'].map(opt => (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.item, !isCustomProcedure && procedure === opt && styles.itemSelected]}
                                onPress={() => {
                                    setIsCustomProcedure(false);
                                    setProcedure(opt);
                                }}
                            >
                                <Text style={[styles.itemText, !isCustomProcedure && procedure === opt && styles.itemTextSelected]}>
                                    {opt}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[styles.item, isCustomProcedure && styles.itemSelected]}
                            onPress={() => {
                                setIsCustomProcedure(true);
                                if (!['Limpieza', 'Extracción', 'Control', 'Ortodoncia'].includes(procedure)) {
                                    // Keep existing custom procedure if they just switch back
                                } else {
                                    setProcedure('');
                                }
                            }}
                        >
                            <Text style={[styles.itemText, isCustomProcedure && styles.itemTextSelected]}>
                                Otro
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {isCustomProcedure && (
                        <TextInput
                            style={[styles.input, { marginTop: 8 }]}
                            placeholder="Escribe el procedimiento..."
                            value={procedure}
                            onChangeText={setProcedure}
                        />
                    )}
                </View>

                <FormInput
                    label="Monto a Cobrar (COP)"
                    style={styles.amountInput}
                    placeholder="0"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
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

                <FormInput
                    label="Nota Adicional"
                    placeholder="Detalles opcionales..."
                    value={description}
                    onChangeText={setDescription}
                />

                <PrimaryButton
                    label="Registrar Ingreso"
                    variant="success"
                    onPress={handleSave}
                />
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
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    item: {
        backgroundColor: 'white',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    itemSelected: {
        backgroundColor: Colors.success,
        borderColor: Colors.success,
    },
    itemText: {
        fontSize: 15,
        color: Colors.text,
        fontWeight: '500',
    },
    itemTextSelected: {
        color: 'white',
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
    datePickerContainer: {
        marginBottom: 8,
    },
    dateLabel: {
        fontSize: 16,
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
