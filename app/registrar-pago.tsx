import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Switch, TextInput, Modal, ActivityIndicator, Pressable } from 'react-native';
import { useColors, useThemedStyles, type Palette } from '../shared/theme';
import { FormInput, PrimaryButton, PhotoGallery } from '../shared/components';
import { Patient } from '../context/AppContext';
import { usePatientsStore } from '../features/patients/store';
import { formatCOPShort, formatInputCOP, parseInputCOP } from '../shared/utils/formatCOP';
import { toLocalDateString } from '../shared/utils/dateUtils';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDialog } from '../shared/context/DialogContext';
import { useFinanceStore } from '../features/finance/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const insets = useSafeAreaInsets();
    const { id, appointmentId: appointmentIdParam, date: dateParam, reason: reasonParam } = useLocalSearchParams();
    const patientParamId = Array.isArray(id) ? id[0] : id;
    const appointmentIdFromNav = Array.isArray(appointmentIdParam) ? appointmentIdParam[0] : (appointmentIdParam || '');
    const appointmentDateFromNav = Array.isArray(dateParam) ? dateParam[0] : (dateParam || '');
    const appointmentReasonFromNav = Array.isArray(reasonParam) ? reasonParam[0] : (reasonParam || '');
    const patients = usePatientsStore((s) => s.patients);
  const addVisit = usePatientsStore((s) => s.addVisit);
  const updatePatient = usePatientsStore((s) => s.updatePatient);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
    const dialog = useDialog();
    const colors = useColors();
    const styles = useThemedStyles(createStyles);

    const initialPatient = patientParamId ? patients.find(p => p.id === patientParamId) : null;

    const [isRegistered, setIsRegistered] = useState(true);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatient?.id ?? null);
    const [anonymousName, setAnonymousName] = useState('');

    const [amount, setAmount] = useState(initialPatient ? formatInputCOP(initialPatient.monthlyFee ?? 0) : '');
    const [procedure, setProcedure] = useState(appointmentReasonFromNav || (initialPatient ? 'Control Mensual' : ''));
    const [isCustomProcedure, setIsCustomProcedure] = useState(false);
    const [description, setDescription] = useState('Consulta/Tratamiento');
    const [photos, setPhotos] = useState<string[]>([]);

    const parseNavDate = (navDate: string): Date => {
        if (!navDate) return new Date();
        if (/^\d{4}-\d{2}-\d{2}$/.test(navDate)) {
            const [y, m, d] = navDate.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0);
        }
        const parsed = new Date(navDate);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    const [date, setDate] = useState<Date>(() => parseNavDate(appointmentDateFromNav));
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [showPatientPicker, setShowPatientPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [showProcedurePicker, setShowProcedurePicker] = useState(false);
    const [searchProcedureQuery, setSearchProcedureQuery] = useState('');

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);

    // Actualizar fecha y procedimiento si cambian los parámetros de navegación
    const [prevAppointmentDate, setPrevAppointmentDate] = useState(appointmentDateFromNav);
    if (appointmentDateFromNav !== prevAppointmentDate) {
        setPrevAppointmentDate(appointmentDateFromNav);
        if (appointmentDateFromNav) {
            setDate(parseNavDate(appointmentDateFromNav));
        }
    }

    const [prevAppointmentReason, setPrevAppointmentReason] = useState(appointmentReasonFromNav);
    if (appointmentReasonFromNav !== prevAppointmentReason) {
        setPrevAppointmentReason(appointmentReasonFromNav);
        if (appointmentReasonFromNav) {
            setProcedure(appointmentReasonFromNav);
        }
    }

    // Si los pacientes cargaron después del montaje inicial y venía un patientParamId
    const [prevPatientParamId, setPrevPatientParamId] = useState<string | null>(initialPatient ? patientParamId : null);
    if (patientParamId && !selectedPatientId && patientParamId !== prevPatientParamId && patients.length > 0) {
        const patient = patients.find(p => p.id === patientParamId);
        if (patient) {
            setPrevPatientParamId(patientParamId);
            setSelectedPatientId(patient.id);
            setAmount(formatInputCOP(patient.monthlyFee ?? 0));
            if (!appointmentReasonFromNav) {
                setProcedure('Control Mensual');
            }
            setIsCustomProcedure(false);
        }
    }

    // Suscribirse al estado de sincronización de la última transacción creada
    const lastTransactionSyncStatus = useFinanceStore((state) => {
        if (!lastTransactionId) return null;
        const tx = state.transactions.find(t => t.id === lastTransactionId);
        return tx?._syncStatus ?? null;
    });

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

    const handleSelectPatient = (patient: Patient) => {
        setIsRegistered(true);
        setSelectedPatientId(patient.id);
        setAmount(formatInputCOP(patient.monthlyFee ?? 0));
        setProcedure('Control Mensual');
        setIsCustomProcedure(false);
        setShowPatientPicker(false);
    };

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
        const numericAmount = parseInputCOP(amount);

        if (isRegistered && selectedPatientId) {
            // Para pacientes registrados, addVisit creará automáticamente la transacción vinculada
            addVisit(selectedPatientId, {
                date: localDateStr,
                reason: procedure || 'Consulta General',
                treatment: description || 'Pago registrado',
                cost: numericAmount,
                paid: true,
                notes: 'Generado automáticamente desde Registrar Pago',
                photos: photos.length > 0 ? photos : undefined,
            });

            // Capturar el ID de la transacción recién creada para mostrar su estado de sync
            // La transacción se crea en useFinanceStore, obtenemos la más reciente
            setTimeout(() => {
                const transactions = useFinanceStore.getState().transactions;
                const newest = transactions[0]; // addTransaction inserta al inicio
                if (newest) setLastTransactionId(newest.id);
            }, 50);

            // Eliminar la cita correcta:
            // 1. Si venimos con appointmentIdFromNav, eliminamos ESA cita exacta.
            // 2. Si no, buscamos la cita que coincida exactamente con la fecha del cobro (localDateStr).
            // 3. Fallback: la cita más cercana a la fecha del cobro.
            const patientsState = usePatientsStore.getState();
            const paidPatient = patientsState.patients.find(p => p.id === selectedPatientId);
            if (paidPatient) {
                const scheduledAppts = (paidPatient.appointments || [])
                    .filter(a => a.status === 'scheduled' || !a.status);

                let apptToDelete = appointmentIdFromNav 
                    ? scheduledAppts.find(a => a.id === appointmentIdFromNav)
                    : undefined;

                if (!apptToDelete && scheduledAppts.length > 0) {
                    // Primero buscar coincidencia exacta por fecha
                    apptToDelete = scheduledAppts.find(a => toLocalDateString(a.date) === localDateStr);

                    // Si no coincide exactamente, buscar la más cercana
                    if (!apptToDelete) {
                        const visitDateMs = new Date(localDateStr + 'T12:00:00').getTime();
                        apptToDelete = scheduledAppts.reduce((prev, curr) => {
                            const diffPrev = Math.abs(new Date(prev.date).getTime() - visitDateMs);
                            const diffCurr = Math.abs(new Date(curr.date).getTime() - visitDateMs);
                            return diffCurr < diffPrev ? curr : prev;
                        });
                    }
                }

                if (apptToDelete) {
                    patientsState.deleteAppointment(selectedPatientId, apptToDelete.id);
                } else if (paidPatient.nextControlDate && toLocalDateString(paidPatient.nextControlDate) === localDateStr) {
                    // Para pacientes sin array appointments pero con nextControlDate en la misma fecha
                    updatePatient(selectedPatientId, {
                        nextControlDate: undefined,
                    });
                }

                updatePatient(selectedPatientId, {
                    lastAppointmentDate: new Date().toISOString(),
                });
            }
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

            // Capturar el ID de la transacción anónima recién creada
            setTimeout(() => {
                const transactions = useFinanceStore.getState().transactions;
                const newest = transactions[0];
                if (newest) setLastTransactionId(newest.id);
            }, 50);
        }

        setShowSuccessModal(true);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.form,
                    { paddingBottom: Math.max(insets.bottom + 48, 64) }
                ]}
                keyboardShouldPersistTaps="handled"
            >

                <View style={styles.switchContainer}>
                    <Text style={styles.label}>¿Paciente Registrado?</Text>
                    <Switch
                        value={isRegistered}
                        onValueChange={setIsRegistered}
                        trackColor={{ false: colors.border, true: colors.success }}
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
                            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
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
                    <Text style={styles.label}>Procedimiento </Text>
                    <TouchableOpacity
                        style={styles.selector}
                        onPress={() => setShowProcedurePicker(true)}
                    >
                        <Text style={procedure || isCustomProcedure ? styles.selectorText : styles.placeholderText}>
                            {isCustomProcedure ? 'Otro (Personalizado)' : (procedure || 'Seleccionar procedimiento...')}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
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
                    placeholder=""
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={(val) => setAmount(formatInputCOP(val))}
                />

                <View style={styles.datePickerContainer}>
                    <Text style={styles.dateLabel}>Fecha del Movimiento</Text>
                    <TouchableOpacity
                        style={styles.dateSelector}
                        onPress={() => setShowDatePicker(true)}
                    ><View style={styles.iconCircle}>
                            <Ionicons name="calendar" size={32} color={colors.primary} />
                        </View>
                        <Text style={styles.dateText}>
                            Fecha: {date.toLocaleDateString("es-ES", { year: 'numeric', month: 'long', day: 'numeric' })}
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

                {/* Sección de Fotografías del Procedimiento */}
                <View style={styles.card}>
                    <PhotoGallery
                        photos={photos}
                        onAddPhoto={(newUrl) => setPhotos((prev) => [...prev, newUrl])}
                        onDeletePhoto={(delUrl) => setPhotos((prev) => prev.filter((p) => p !== delUrl))}
                        patientId={selectedPatientId || 'temp'}
                        title="Fotografías del Procedimiento (Opcional)"
                    />
                </View>

                <PrimaryButton
                    label="Registrar Ingreso"
                    variant="success"
                    onPress={handleSave}
                />
            </ScrollView>

            {/* Patient Picker Modal */}
            <Modal visible={showPatientPicker} animationType="slide" transparent onRequestClose={() => setShowPatientPicker(false)}>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPatientPicker(false)}
                >
                    <Pressable style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Seleccionar Paciente</Text>
                            <TouchableOpacity onPress={() => setShowPatientPicker(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar por nombre..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="words"
                            />
                        </View>
                        <ScrollView style={styles.patientList} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
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
                    </Pressable>
                </TouchableOpacity>
            </Modal>
            {/* Procedure Picker Modal */}
            <Modal visible={showProcedurePicker} animationType="slide" transparent onRequestClose={() => setShowProcedurePicker(false)}>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowProcedurePicker(false)}
                >
                    <Pressable style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Seleccionar Procedimiento</Text>
                            <TouchableOpacity onPress={() => setShowProcedurePicker(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
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
                                        setAmount(formatInputCOP(proc.precio));
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
                                <Text style={[styles.patientItemName, { color: colors.primary }]}>+ Agregar Otro (Personalizado)</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </Pressable>
                </TouchableOpacity>
            </Modal>

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={() => { setShowSuccessModal(false); router.back(); }}
            >
                <View style={styles.successOverlay}>
                    <View style={styles.successCard}>
                        {/* Ícono principal */}
                        <View style={styles.successIconCircle}>
                            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
                        </View>

                        <Text style={styles.successTitle}>¡Pago Registrado!</Text>
                        <Text style={styles.successSubtitle}>
                            El pago se guardó localmente en el sistema.
                        </Text>

                        {/* Indicador de sincronización con Supabase */}
                        <View style={styles.syncStatusBox}>
                            {lastTransactionSyncStatus === 'synced' ? (
                                <>
                                    <Ionicons name="cloud-done-outline" size={20} color={colors.success} />
                                    <Text style={[styles.syncStatusText, { color: colors.success }]}>
                                        Subido a la base de datos ✓
                                    </Text>
                                </>
                            ) : lastTransactionSyncStatus === 'pending' ? (
                                <>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                    <Text style={[styles.syncStatusText, { color: colors.primary }]}>
                                        Sincronizando con la nube...
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="cloud-offline-outline" size={20} color={colors.textSecondary} />
                                    <Text style={[styles.syncStatusText, { color: colors.textSecondary }]}>
                                        Guardado local (sin conexión)
                                    </Text>
                                </>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.successButton}
                            onPress={() => {
                                setShowSuccessModal(false);
                                setLastTransactionId(null);
                                router.back();
                            }}
                        >
                            <Text style={styles.successButtonText}>Aceptar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        gap: 20,
    },
    card: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    iconCircle: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: colors.primary + "20",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    item: {
        backgroundColor: colors.card,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    itemSelected: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    itemText: {
        fontSize: 15,
        color: colors.text,
        fontWeight: '500',
    },
    itemTextSelected: {
        color: 'white',
    },
    selector: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectorText: {
        fontSize: 16,
        color: colors.text,
    },
    placeholderText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    input: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    amountInput: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        color: colors.success,
    },
    datePickerContainer: {
        marginBottom: 3,
    },
    dateLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    dateSelector: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 12,
        padding: 16,
        backgroundColor: colors.background,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.primary + "30",
    },
    dateText: {
        fontSize: 16,
        color: colors.text,
        textTransform: 'capitalize',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
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
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
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
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    patientItemName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    patientItemDetail: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    emptyText: {
        textAlign: 'center',
        color: colors.textSecondary,
        marginTop: 20,
        marginBottom: 40,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginTop: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
    },
    // ─── Success Modal ─────────────────────────────────────────────────────────
    successOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    successCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 32,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 12,
    },
    successIconCircle: {
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    successSubtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    syncStatusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.background,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        width: '100%',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    syncStatusText: {
        fontSize: 14,
        fontWeight: '600',
        flexShrink: 1,
    },
    successButton: {
        backgroundColor: colors.success,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 48,
        width: '100%',
        alignItems: 'center',
    },
    successButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
