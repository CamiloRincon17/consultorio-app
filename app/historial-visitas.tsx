import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors, useThemedStyles, type Palette } from "../shared/theme";
import { Visit } from "../features/patients/types";
import { usePatientsStore } from "../features/patients/store";
import { useFinanceStore } from "../features/finance/store";
import { formatCOPShort, formatInputCOP, parseInputCOP } from "../shared/utils/formatCOP";
import { toLocalDateString } from "../shared/utils/dateUtils";
import { ConfirmModal } from "../shared/components/ConfirmModal";
import { useDialog } from "../shared/context/DialogContext";
import { PhotoGallery } from "../shared/components";

interface VisitWithPatient extends Visit {
    patientName?: string;
    patientId?: string;
}

export default function HistorialVisitasScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string; patientId?: string; openAdd?: string }>();
    const rawPatientId = params.id || params.patientId;
    const patientId = Array.isArray(rawPatientId) ? rawPatientId[0] : rawPatientId;
    const openAdd = params.openAdd;
    const isGlobal = !patientId;
    const dialog = useDialog();
    const colors = useColors();
    const styles = useThemedStyles(createStyles);

    const patients = usePatientsStore((s) => s.patients);
    const addVisit = usePatientsStore((s) => s.addVisit);
    const updateVisit = usePatientsStore((s) => s.updateVisit);
    const deleteVisit = usePatientsStore((s) => s.deleteVisit);

    const patient = patientId ? patients.find((p) => p.id === patientId) : null;

    // Get visits: either for one patient or all of them directly (without useMemo to force eager re-render)
    let visits: VisitWithPatient[] = [];
    if (patientId) {
        visits = (patient?.visits || []).map(v => ({ ...v, patientId, patientName: patient?.name }));
    } else {
        // Global view: flatten all visits
        visits = patients.flatMap((p) =>
            (p.visits || []).map((v) => ({
                ...v,
                patientName: p.name,
                patientId: p.id,
            }))
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const [modalVisible, setModalVisible] = useState(() => openAdd === 'true' && !isGlobal);
    const [editingVisit, setEditingVisit] = useState<VisitWithPatient | null>(null);
    const [visitToDelete, setVisitToDelete] = useState<VisitWithPatient | null>(null);

    // Form state
    const [date, setDate] = useState(toLocalDateString(new Date()));
    const [reason, setReason] = useState("");
    const [treatment, setTreatment] = useState("");
    const [notes, setNotes] = useState("");
    const [cost, setCost] = useState("");
    const [paid, setPaid] = useState(false);
    const [photos, setPhotos] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'visitas' | 'galeria'>('visitas');

    // Collect all patient photos with visit info across all visits
    const patientPhotosWithInfo = useMemo(() => {
        return visits.flatMap(v =>
            (v.photos || []).map(url => ({
                url,
                visitId: v.id,
                visitDate: new Date(v.date).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                }),
                visitReason: v.reason,
                visitTreatment: v.treatment,
            }))
        );
    }, [visits]);

    const resetForm = () => {
        setDate(toLocalDateString(new Date()));
        setReason("");
        setTreatment("");
        setNotes("");
        setCost("");
        setPaid(false);
        setPhotos([]);
        setEditingVisit(null);
    };

    const closeModal = () => {
        setModalVisible(false);
        resetForm();
        if (openAdd) {
            router.setParams({ openAdd: undefined });
        }
    };

    const openAddModal = () => {
        if (isGlobal) {
            dialog.alert("Selección requerida", "Para agregar una visita, por favor ve a la sección de Pacientes y selecciona uno.", "info");
            return;
        }
        resetForm();
        setModalVisible(true);
    };

    // If looking for a specific patient and not found, show error
    if (patientId && !patient) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Error</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={styles.errorText}>Paciente no encontrado</Text>
                </View>
            </SafeAreaView>
        );
    }

    const openEditModal = (visit: VisitWithPatient) => {
        setEditingVisit(visit);
        setDate(visit.date);
        setReason(visit.reason || "");
        setTreatment(visit.treatment || "");
        setNotes(visit.notes || "");
        setCost(formatInputCOP(visit.cost ?? 0));
        setPaid(visit.paid || false);
        setPhotos(visit.photos || []);
        setModalVisible(true);
    };

    const handleSave = () => {
        if (!date) {
            dialog.alert("Error", "La fecha es requerida", "error");
            return;
        }

        const visitData: Omit<Visit, "id"> = {
            date,
            reason: reason || undefined,
            treatment: treatment || undefined,
            notes: notes || undefined,
            cost: cost ? parseInputCOP(cost) : undefined,
            paid,
            photos: photos.length > 0 ? photos : undefined,
        };

        if (editingVisit) {
            // Use the patientId from the visit itself (for global view editing) or the current patientId
            const targetPatientId = editingVisit.patientId || patientId;
            if (targetPatientId) {
                updateVisit(targetPatientId, editingVisit.id, visitData);
                dialog.alert("Éxito", "Visita actualizada correctamente", "success");
            }
        } else if (patientId) {
            addVisit(patientId, visitData);
            dialog.alert("Éxito", "Visita agregada correctamente", "success");
        }

        closeModal();
    };

    const handleDelete = (visit: VisitWithPatient) => {
        setVisitToDelete(visit);
    };

    const confirmDelete = () => {
        if (!visitToDelete) return;
        const targetPatientId = visitToDelete.patientId || patientId;
        if (targetPatientId) {
            deleteVisit(targetPatientId, visitToDelete.id);
        }
        setVisitToDelete(null);
    };

    const renderVisitCard = ({ item }: { item: VisitWithPatient }) => {
        const visitDate = new Date(item.date);
        const formattedDate = visitDate.toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        const isSynced = item._syncStatus === 'synced';
        const isPending = item._syncStatus === 'pending';
        const hasNoStatus = !item._syncStatus; // Visitas viejas sin campo (cargadas de caché)

        // Mostrar fecha de última modificación si existe
        const lastModifiedLabel = item._lastModified
            ? new Date(item._lastModified).toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', year: '2-digit',
                hour: '2-digit', minute: '2-digit',
            })
            : null;

        return (
            <View style={styles.visitCard}>
                {/* Patient Name Header if Global */}
                {isGlobal && item.patientName && (
                    <View style={styles.patientHeader}>
                        <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                        <Text style={styles.patientNameText}>{item.patientName}</Text>
                    </View>
                )}

                <View style={styles.visitHeader}>
                    <View style={styles.dateContainer}>
                        <Ionicons name="calendar" size={20} color={colors.primary} />
                        <Text style={styles.visitDate}>{formattedDate}</Text>
                    </View>
                    <View style={styles.visitActions}>
                        {/* Badge de estado de sincronización */}
                        {isPending && (
                            <View style={styles.syncBadgePending}>
                                <ActivityIndicator size={10} color={colors.warning} />
                                <Text style={styles.syncBadgePendingText}>Guardando...</Text>
                            </View>
                        )}
                        {isSynced && (
                            <View style={styles.syncBadgeSynced}>
                                <Ionicons name="cloud-done-outline" size={12} color={colors.success} />
                                <Text style={styles.syncBadgeSyncedText}>En la nube</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={() => openEditModal(item)}
                            style={styles.iconButton}
                        >
                            <Ionicons
                                name="create-outline"
                                size={22}
                                color={colors.primary}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleDelete(item)}
                            style={styles.iconButton}
                        >
                            <Ionicons name="trash-outline" size={22} color={colors.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Chip de última modificación */}
                {lastModifiedLabel && (
                    <View style={styles.modifiedChip}>
                        <Ionicons name="pencil-outline" size={11} color={colors.textSecondary} />
                        <Text style={styles.modifiedChipText}>Modificado: {lastModifiedLabel}</Text>
                    </View>
                )}

                {item.reason && (
                    <View style={styles.visitDetail}>
                        <Ionicons
                            name="medical-outline"
                            size={16}
                            color={colors.textSecondary}
                        />
                        <Text style={styles.detailText}>
                            <Text style={styles.detailLabel}>Motivo: </Text>
                            {item.reason}
                        </Text>
                    </View>
                )}

                {item.treatment && (
                    <View style={styles.visitDetail}>
                        <Ionicons
                            name="fitness-outline"
                            size={16}
                            color={colors.textSecondary}
                        />
                        <Text style={styles.detailText}>
                            <Text style={styles.detailLabel}>Tratamiento: </Text>
                            {item.treatment}
                        </Text>
                    </View>
                )}

                {item.notes && (
                    <View style={styles.visitDetail}>
                        <Ionicons
                            name="document-text-outline"
                            size={16}
                            color={colors.textSecondary}
                        />
                        <Text style={styles.detailText}>
                            <Text style={styles.detailLabel}>Notas: </Text>
                            {item.notes}
                        </Text>
                    </View>
                )}

                {item.cost !== undefined && (
                    <View style={styles.costContainer}>
                        <Text style={styles.costLabel}>Costo:</Text>
                        <Text style={styles.costValue}>{formatCOPShort(item.cost)}</Text>
                        {item.paid ? (
                            <View style={styles.paidBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="white" />
                                <Text style={styles.paidText}>Pagado</Text>
                            </View>
                        ) : (
                            <View style={styles.unpaidBadge}>
                                <Ionicons
                                    name="close-circle-outline"
                                    size={16}
                                    color={colors.danger}
                                />
                                <Text style={styles.unpaidText}>Pendiente</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>
                        {isGlobal ? "Historial Global" : "Historial de Visitas"}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isGlobal ? "Todas las visitas registradas" : patient?.name}
                    </Text>
                </View>
            </View>

            {/* Stats Summary */}
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                    <Text style={styles.statValue}>{visits.length}</Text>
                    <Text style={styles.statLabel}>
                        {visits.length === 1 ? "Visita" : "Visitas"}
                    </Text>
                </View>
                <View style={styles.statBox}>
                    <Ionicons name="cash-outline" size={24} color={colors.success} />
                    <Text style={styles.statValue}>
                        {formatCOPShort(
                            visits.reduce((sum, v) => sum + (v.cost || 0), 0),
                        )}
                    </Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statBox}>
                    <Ionicons
                        name="checkmark-done-outline"
                        size={24}
                        color={colors.success}
                    />
                    <Text style={styles.statValue}>
                        {visits.filter((v) => v.paid).length}
                    </Text>
                    <Text style={styles.statLabel}>Pagadas</Text>
                </View>
            </View>

            {/* Pestañas: Visitas | Galería */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'visitas' && styles.activeTabButton]}
                    onPress={() => setActiveTab('visitas')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="list-outline"
                        size={18}
                        color={activeTab === 'visitas' ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.tabText, activeTab === 'visitas' && styles.activeTabText]}>
                        Visitas ({visits.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'galeria' && styles.activeTabButton]}
                    onPress={() => setActiveTab('galeria')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="images-outline"
                        size={18}
                        color={activeTab === 'galeria' ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.tabText, activeTab === 'galeria' && styles.activeTabText]}>
                        Galería ({patientPhotosWithInfo.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'visitas' ? (
                <FlatList
                    data={visits}
                    keyExtractor={(item) => item.id}
                    renderItem={renderVisitCard}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons
                                name="folder-open-outline"
                                size={64}
                                color={colors.border}
                            />
                            <Text style={styles.emptyText}>No hay visitas registradas</Text>
                            <Text style={styles.emptySubtext}>
                                {isGlobal
                                    ? "Las visitas de los pacientes aparecerán aquí"
                                    : "Presiona el botón + para agregar una visita"}
                            </Text>
                        </View>
                    }
                />
            ) : (
                <ScrollView contentContainerStyle={styles.galleryTabContent}>
                    <View style={styles.galleryCard}>
                        <PhotoGallery
                            photosWithInfo={patientPhotosWithInfo}
                            readOnly={isGlobal}
                            onAddPhotoInVisit={() => openAddModal()}
                            patientId={patientId || ''}
                            title="Galería Fotográfica del Paciente"
                            iconName="images-outline"
                            iconSize={20}
                        />
                    </View>
                </ScrollView>
            )}

            {/* Add Button - Only visible for specific patient */}
            {!isGlobal && (
                <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                    <Ionicons name="add" size={28} color="white" />
                </TouchableOpacity>
            )}

            {/* Modal para agregar/editar visita */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingVisit ? "Editar Visita" : "Nueva Visita"}
                            </Text>
                            <TouchableOpacity onPress={closeModal}>
                                <Ionicons name="close" size={28} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {/* Fecha */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>
                                    Fecha <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    value={date}
                                    onChangeText={setDate}
                                    placeholder="YYYY-MM-DD"
                                />
                            </View>

                            {/* Motivo */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Motivo de la Visita</Text>
                                <TextInput
                                    style={styles.input}
                                    value={reason}
                                    onChangeText={setReason}
                                    placeholder="Ej: Control mensual, Dolor, etc."
                                />
                            </View>

                            {/* Tratamiento */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Tratamiento Realizado</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={treatment}
                                    onChangeText={setTreatment}
                                    placeholder="Describe el tratamiento"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            {/* Notas */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Notas Adicionales</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={notes}
                                    onChangeText={setNotes}
                                    placeholder="Observaciones, recomendaciones..."
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            {/* Costo */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Costo ($)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={cost}
                                    onChangeText={(val) => setCost(formatInputCOP(val))}
                                    placeholder="ej. 150.000"
                                    keyboardType="numeric"
                                />
                            </View>

                            {/* Estado de Pago */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Estado de Pago</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.toggleButton,
                                        paid && styles.toggleButtonActive,
                                    ]}
                                    onPress={() => setPaid(!paid)}
                                >
                                    <Ionicons
                                        name={paid ? "checkmark-circle" : "close-circle-outline"}
                                        size={24}
                                        color={paid ? "white" : colors.textSecondary}
                                    />
                                    <Text
                                        style={[
                                            styles.toggleText,
                                            paid && styles.toggleTextActive,
                                        ]}
                                    >
                                        {paid ? "Pagado" : "Pendiente"}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Fotografías del procedimiento */}
                            <View style={styles.inputGroup}>
                                <PhotoGallery
                                    photos={photos}
                                    onAddPhoto={(newUrl) => setPhotos((prev) => [...prev, newUrl])}
                                    onDeletePhoto={(delUrl) => setPhotos((prev) => prev.filter((p) => p !== delUrl))}
                                    patientId={editingVisit?.patientId || patientId}
                                    visitId={editingVisit?.id}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.saveButton]}
                                onPress={handleSave}
                            >
                                <Text style={styles.saveButtonText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <ConfirmModal
                visible={!!visitToDelete}
                title="Eliminar Visita"
                message="¿Estás seguro que deseas eliminar esta visita? Esta acción no se puede deshacer y borrará el ingreso registrado."
                confirmText="Sí, Eliminar"
                onConfirm={confirmDelete}
                onCancel={() => setVisitToDelete(null)}
                icon="trash"
            />
        </SafeAreaView>
    );
}

const createStyles = (colors: Palette) =>
    StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        marginRight: 12,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        padding: 16,
        backgroundColor: colors.card,
        marginTop: 8,
    },
    statBox: {
        alignItems: "center",
    },
    statValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.text,
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    visitCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    patientHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + '40',
    },
    patientNameText: {
        fontSize: 14,
        fontWeight: "bold",
        color: colors.primary,
    },
    visitHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    visitDate: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        textTransform: "capitalize",
    },
    visitActions: {
        flexDirection: "row",
        gap: 12,
    },
    iconButton: {
        padding: 4,
    },
    visitDetail: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        marginBottom: 8,
    },
    detailText: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
    },
    detailLabel: {
        fontWeight: "600",
        color: colors.textSecondary,
    },
    costContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 8,
    },
    costLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.textSecondary,
    },
    costValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: colors.success,
        flex: 1,
    },
    paidBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: colors.success,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    paidText: {
        color: "white",
        fontSize: 12,
        fontWeight: "600",
    },
    unpaidBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: colors.background,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.danger,
    },
    unpaidText: {
        color: colors.danger,
        fontSize: 12,
        fontWeight: "600",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.textSecondary,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
        textAlign: "center",
    },
    addButton: {
        position: "absolute",
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    errorText: {
        fontSize: 16,
        color: colors.danger,
        textAlign: "center",
        marginTop: 32,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "90%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.text,
    },
    modalBody: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 8,
    },
    required: {
        color: colors.danger,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        backgroundColor: colors.card,
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
    },
    toggleButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        gap: 8,
    },
    toggleButtonActive: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    toggleText: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    toggleTextActive: {
        color: "white",
    },
    modalFooter: {
        flexDirection: "row",
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    button: {
        flex: 1,
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: colors.background,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
    },
    saveButton: {
        backgroundColor: colors.primary,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "white",
    },
    // ─── Badges de sincronización ─────────────────────────────────────────────
    syncBadgePending: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: colors.surface,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.warning,
    },
    syncBadgePendingText: {
        fontSize: 10,
        fontWeight: "700",
        color: colors.warning,
    },
    syncBadgeSynced: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: colors.surface,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.success,
    },
    syncBadgeSyncedText: {
        fontSize: 10,
        fontWeight: "700",
        color: colors.success,
    },
    modifiedChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 10,
        alignSelf: "flex-start",
        backgroundColor: colors.surface,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    modifiedChipText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontStyle: "italic",
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tabButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
    },
    activeTabButton: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.primary + "40",
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.textSecondary,
    },
    activeTabText: {
        color: colors.primary,
        fontWeight: "700",
    },
    galleryTabContent: {
        padding: 16,
    },
    galleryCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
});
