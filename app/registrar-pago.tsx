import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Switch, TextInput, Modal, Alert } from 'react-native';
import { Colors } from '../shared/constants/Colors';
import { FormInput, PrimaryButton, ConfirmModal } from '../shared/components';
import { Patient, useApp } from '../context/AppContext';
import { formatCOPShort } from '../shared/utils/formatCOP';
import { toLocalDateString } from '../shared/utils/dateUtils';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDialog } from '../shared/context/DialogContext';

const PROCEDIMIENTOS_PREDEFINIDOS = [
    { id: 'Restauración dental', nombre: 'Restauración dental', precio: '50000' },
    { id: 'Limpieza dental', nombre: 'Limpieza dental', precio: '80000' },
    { id: 'Extracción dental', nombre: 'Extracción dental', precio: '80000' },
    { id: 'Extracción de cordal', nombre: 'Extracción de cordal', precio: '150000' },
    { id: 'Tratamiento de conducto unirradicular', nombre: 'Tratamiento de conducto unirradicular', precio: '310000' },
    { id: 'Tratamiento de conducto birradicular', nombre: 'Tratamiento de conducto birradicular', precio: '350000' },
    { id: 'Tratamiento de conducto multirradicular', nombre: 'Tratamiento de conducto multirradicular', precio: '410000' },
    { id: 'Retratamiento unirradicular', nombre: 'Retratamiento unirradicular', precio: '350000' },
    { id: 'Retratamiento birradicular', nombre: 'Retratamiento birradicular', precio: '380000' },
    { id: 'Retratamiento multirradicular', nombre: 'Retratamiento multirradicular', precio: '450000' },
    { id: 'Montaje de ortodoncia', nombre: 'Montaje de ortodoncia', precio: '300000' },
    { id: 'Control de ortodoncia', nombre: 'Control de ortodoncia', precio: '60000' },
    { id: 'Reparación de brackets', nombre: 'Reparación de brackets', precio: '25000' },
    { id: 'Recorte de encía', nombre: 'Recorte de encía', precio: '70000' },
    { id: 'Corona metal cerámica', nombre: 'Corona metal cerámica', precio: '600000' },
    { id: 'Corona libre de metal', nombre: 'Corona libre de metal', precio: '900000' },
    { id: 'Protesis(Acker)', nombre: 'Protesis(Acker)', precio: '150000' },
];

export default function RegisterPayment() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const patientParamId = Array.isArray(id) ? id[0] : id;
    const { patients, addTransaction, addVisit } = useApp();
    const dialog = useDialog();

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
    const [searchQuery, setSearchQuery] = useState('');

    const [showProcedurePicker, setShowProcedurePicker] = useState(false);
    const [searchProcedureQuery, setSearchProcedureQuery] = useState('');

    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const selectedPatient = useMemo(() =>
        patients.find(p => p.id === selectedPatientId),
        [patients, selectedPatientId]
    );

    const filteredPatients = useMemo(() => {
        if (!searchQuery.trim()) return patients;
        return patients.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [patients, searchQuery]);

    const filteredProcedures = useMemo(() => {
        if (!searchProcedureQuery.trim()) return PROCEDIMIENTOS_PREDEFINIDOS;
        return PROCEDIMIENTOS_PREDEFINIDOS.filter(p => 
            p.nombre.toLowerCase().includes(searchProcedureQuery.toLowerCase())
        );
    }, [searchProcedureQuery]);

    const handleSelectPatient = useCallback((patient: Patient) => {
        setIsRegistered(true);
        setSelectedPatientId(patient.id);
        setAmount((patient.monthlyFee ?? 0).toString());
        setProcedure('Control Mensual');
        setIsCustomProcedure(false);
        setShowPatientPicker(false);
    }, []);

    useEffect(() => {
        if (patientParamId && !selectedPatientId && patients.length > 0) {
            const patient = patients.find(p => p.id === patientParamId);
            if (patient) {
                handleSelectPatient(patient);
            }
        }
    }, [patientParamId, patients, selectedPatientId, handleSelectPatient]);

    const handleSave = () => {
        const finalPatientName = isRegistered ? selectedPatient?.name : anonymousName;

        if (isRegistered && !selectedPatientId) {
            dialog.alert('Error', 'Debes seleccionar un paciente registrado', 'error');
            return;
        }
        if (!isRegistered && !anonymousName.trim()) {
            dialog.alert('Error', 'Debes ingresar el nombre del paciente', 'error');
            return;
        }
        if (!amount.trim()) {
            dialog.alert('Error', 'El monto es obligatorio', 'error');
            return;
        }

        const localDateStr = toLocalDateString(date); // YYYY-MM-DD in LOCAL time (no UTC drift)
        const numericAmount = parseFloat(amount) || 0;

        if (isRegistered && selectedPatientId) {
            // Para pacientes registrados, addVisit creará automáticamente la transacción vinculada
            addVisit(selectedPatientId, {
                date: localDateStr,
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
                date: localDateStr,
            });
        }

        setShowSuccessModal(true);
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
                    <TouchableOpacity
                        style={styles.selector}
                        onPress={() => setShowProcedurePicker(true)}
                    >
                        <Text style={procedure || isCustomProcedure ? styles.selectorText : styles.placeholderText}>
                            {isCustomProcedure ? 'Otro (Personalizado)' : (procedure || 'Seleccionar procedimiento...')}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
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
            <Modal visible={showPatientPicker} animationType="slide" transparent onRequestClose={() => setShowPatientPicker(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Seleccionar Paciente</Text>
                            <TouchableOpacity onPress={() => setShowPatientPicker(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar por nombre..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="words"
                            />
                        </View>
                        <ScrollView style={styles.patientList} contentContainerStyle={{ paddingBottom: 60 }}>
                            {filteredPatients.map(patient => (
                                <TouchableOpacity
                                    key={patient.id}
                                    style={styles.patientItem}
                                    onPress={() => handleSelectPatient(patient)}
                                >
                                    <Text style={styles.patientItemName}>{patient.name}</Text>
                                    <Text style={styles.patientItemDetail}>Cuota: {formatCOPShort(patient.monthlyFee ?? 0)}</Text>
                                </TouchableOpacity>
                            ))}
                            {filteredPatients.length === 0 && (
                                <Text style={styles.emptyText}>No hay pacientes registrados.</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            {/* Procedure Picker Modal */}
            <Modal visible={showProcedurePicker} animationType="slide" transparent onRequestClose={() => setShowProcedurePicker(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Seleccionar Procedimiento</Text>
                            <TouchableOpacity onPress={() => setShowProcedurePicker(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar procedimiento..."
                                value={searchProcedureQuery}
                                onChangeText={setSearchProcedureQuery}
                                autoCapitalize="none"
                            />
                        </View>
                        <ScrollView style={styles.patientList} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                            {filteredProcedures.map(proc => (
                                <TouchableOpacity
                                    key={proc.id}
                                    style={styles.patientItem}
                                    onPress={() => {
                                        setIsCustomProcedure(false);
                                        setProcedure(proc.nombre);
                                        setAmount(proc.precio);
                                        setShowProcedurePicker(false);
                                        setSearchProcedureQuery('');
                                    }}
                                >
                                    <Text style={styles.patientItemName}>{proc.nombre}</Text>
                                    <Text style={styles.patientItemDetail}>{formatCOPShort(parseInt(proc.precio))}</Text>
                                </TouchableOpacity>
                            ))}
                            {filteredProcedures.length === 0 && (
                                <Text style={styles.emptyText}>No hay resultados.</Text>
                            )}
                            <TouchableOpacity
                                style={styles.patientItem}
                                onPress={() => {
                                    setIsCustomProcedure(true);
                                    if (PROCEDIMIENTOS_PREDEFINIDOS.some(p => p.nombre === procedure)) {
                                        setProcedure('');
                                        setAmount('');
                                    }
                                    setShowProcedurePicker(false);
                                    setSearchProcedureQuery('');
                                }}
                            >
                                <Text style={[styles.patientItemName, {color: Colors.primary}]}>+ Agregar Otro (Personalizado)</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            
            {/* Success Modal */}
            <ConfirmModal
                visible={showSuccessModal}
                title="Pago Registrado"
                message="El pago se ha registrado exitosamente en el sistema."
                confirmText="Aceptar"
                onConfirm={() => {
                    setShowSuccessModal(false);
                    router.back();
                }}
                onCancel={() => {}}
                hideCancel={true}
                icon="checkmark-circle"
                iconColor={Colors.success}
                confirmStyle="success"
            />
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
        marginBottom: 40,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginTop: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.text,
    }
});
