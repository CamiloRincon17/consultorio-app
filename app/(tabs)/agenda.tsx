import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Fragment, useCallback, useMemo, useState } from "react";
import {
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { ActivityIndicator } from "react-native";
import { Colors } from "../../shared/constants/Colors";
import { isSameLocalDay, toLocalDateString } from "../../shared/utils/dateUtils";
import { sortSpecialistBlocksByTime } from "../../shared/utils/scheduleUtils";
import { Patient, Visit } from "../../features/patients/types";
import { usePatientsStore } from "../../features/patients/store";
import { useSpecialistStore } from "../../features/specialists/store";
import { useAuthStore } from "../../features/auth/store";
import { useSyncStore } from "../../shared/stores/syncStore";
import { useDialog } from "../../shared/context/DialogContext";
import { AgendaSkeleton } from "../../shared/components/SkeletonLoader";

LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

const formatDateKey = (date: Date): string => toLocalDateString(date);

export default function AgendaScreen() {
    const router = useRouter();
    const dialog = useDialog();
    const patients = usePatientsStore((s) => s.patients);
    const isLoading = usePatientsStore((s) => s.isLoading);
    const specialistBlocks = useSpecialistStore((s) => s.specialistBlocks);
    const userId = useAuthStore((s) => s.user?.id ?? "");
    const refetch = useSyncStore((s) => s.refetch);
    const isSyncing = useSyncStore((s) => s.isSyncing);
    
    const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));

    // Bloques del especialista para la fecha seleccionada ordenados por hora
    const activeSpecialistBlocks = useMemo(() => {
        const dateObj = new Date(selectedDate + "T12:00:00Z");
        const dayOfWeek = dateObj.getUTCDay();
        const filtered = specialistBlocks.filter((b) => {
            if (b.isRecurring) {
                return b.recurringDays?.includes(dayOfWeek);
            }
            return b.date === selectedDate;
        });
        return sortSpecialistBlocksByTime(filtered);
    }, [specialistBlocks, selectedDate]);

    // Conteo de items pendientes de sincronización
    const pendingCount = useMemo(() => {
        let count = 0;
        patients.forEach((p) => {
            if (p._syncStatus === 'pending') count++;
            if (p.visits) {
                p.visits.forEach((v) => {
                    if (v._syncStatus === 'pending') count++;
                });
            }
        });
        return count;
    }, [patients]);

    const handleRefresh = useCallback(async () => {
        if (!userId) return;
        try { await refetch(userId); } catch {}
    }, [userId, refetch]);

    const agendaData = useMemo(() => {
        const upcoming: (Patient & { 
            controlDateObj: Date; 
            isVisit?: boolean; 
            visitDetails?: string; 
            realId: string; 
            hasAttended?: boolean;
            extraVisits?: Visit[];
        })[] = [];

        patients.forEach((p) => {
            if (p.nextControlDate) {
                const controlLocal = toLocalDateString(p.nextControlDate);

                const controlDateObj = new Date(controlLocal + 'T00:00:00');
                const windowStart = new Date(controlDateObj);
                windowStart.setDate(windowStart.getDate() - 7);
                const windowStartStr = toLocalDateString(windowStart);

                const windowVisits = (p.visits || []).filter(v => {
                    const vDate = toLocalDateString(v.date);
                    return vDate >= windowStartStr && vDate <= controlLocal;
                });

                const controlVisits = windowVisits.filter(v => 
                    /control|mensual|mensualidad/i.test(v.reason || '') ||
                    /control|mensual|mensualidad/i.test(v.treatment || '')
                );
                
                const extraVisits = windowVisits.filter(v => 
                    !(/control|mensual|mensualidad/i.test(v.reason || '') ||
                      /control|mensual|mensualidad/i.test(v.treatment || ''))
                );

                const matchingVisit = controlVisits.length > 0 ? controlVisits.reduce((latest, v) =>
                    toLocalDateString(v.date) >= toLocalDateString(latest.date) ? v : latest
                ) : undefined;

                const isAdvance = matchingVisit && !isSameLocalDay(matchingVisit.date, controlLocal);

                upcoming.push({ 
                    ...p, 
                    controlDateObj: new Date(p.nextControlDate), 
                    realId: p.id,
                    hasAttended: !!matchingVisit,
                    visitDetails: matchingVisit
                        ? `${isAdvance ? '(Ant.) ' : ''}${matchingVisit.reason || matchingVisit.treatment || 'Visita registrada'}`
                        : undefined,
                    extraVisits: extraVisits
                });
            }
            if (p.visits && p.visits.length > 0) {
                p.visits.forEach(v => {
                    upcoming.push({
                        ...p,
                        id: `${p.id}-visit-${v.id}`,
                        realId: p.id,
                        controlDateObj: new Date(v.date),
                        isVisit: true,
                        visitDetails: v.reason || v.treatment || "Visita",
                        _syncStatus: v._syncStatus || p._syncStatus,
                    });
                });
            }
        });

        upcoming.sort((a, b) => a.controlDateObj.getTime() - b.controlDateObj.getTime());
        return upcoming;
    }, [patients]);

    const items = useMemo(() => {
        const groups: any = {};
        
        // Pre-fill a range of dates with empty arrays to prevent Agenda infinite loops
        const today = new Date();
        for (let i = -30; i < 90; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            groups[formatDateKey(d)] = [];
        }

        agendaData.forEach((p) => {
            const dateKey = formatDateKey(p.controlDateObj);
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(p);
        });
        return groups;
    }, [agendaData]);

    const buildAgendaMessage = useCallback(() => {
        const selectedDateObj = new Date(selectedDate + "T12:00:00Z");
        const selectedMonth = selectedDateObj.getUTCMonth();
        const selectedYear = selectedDateObj.getUTCFullYear();

        // Siempre desde el día seleccionado en el calendario en adelante
        const startKey = selectedDate;

        const allDayKeys = new Set<string>();

        Object.keys(items).forEach(key => {
            const d = new Date(key + "T12:00:00Z");
            if (
                key >= startKey &&
                d.getUTCMonth() === selectedMonth &&
                d.getUTCFullYear() === selectedYear &&
                items[key]?.length > 0
            ) {
                allDayKeys.add(key);
            }
        });

        specialistBlocks.forEach(block => {
            if (block.isRecurring) {
                const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                for (let day = 1; day <= daysInMonth; day++) {
                    const d = new Date(selectedYear, selectedMonth, day);
                    const key = toLocalDateString(d);
                    if (key >= startKey && block.recurringDays?.includes(d.getDay())) {
                        allDayKeys.add(key);
                    }
                }
            } else if (block.date) {
                const d = new Date(block.date + "T12:00:00Z");
                if (
                    block.date >= startKey &&
                    d.getUTCMonth() === selectedMonth &&
                    d.getUTCFullYear() === selectedYear
                ) {
                    allDayKeys.add(block.date);
                }
            }
        });

        const upcomingDays = [...allDayKeys].sort().map(key => ({
            dateKey: key,
            dateObj: new Date(key + "T12:00:00Z"),
            patients: items[key] || [],
        }));

        if (upcomingDays.length === 0) return "";

        const startDayLabel = selectedDateObj.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
        const rangeLabel = `Desde el ${startDayLabel}`;

        let message = `📋 *AGENDA DEL CONSULTORIO*\n`;
        message += `📅 *${rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1)}*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        let totalCitas = 0;
        upcomingDays.forEach(({ dateKey, dateObj, patients }) => {
            const dayLabel = dateObj.toLocaleDateString("es-ES", {
                weekday: "long", day: "numeric", month: "long", timeZone: "UTC"
            });
            message += `📌 *${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}*\n`;

            const dayOfWeek = dateObj.getUTCDay();
            const blocksForDay = specialistBlocks.filter(b => {
                if (b.isRecurring) return b.recurringDays?.includes(dayOfWeek);
                return b.date === dateKey;
            }).sort((a, b) => {
                const toMin = (t: string) => {
                    const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                    if (!m) return 0;
                    let h = parseInt(m[1], 10);
                    const min = parseInt(m[2], 10);
                    if (m[3]?.toUpperCase() === 'PM' && h < 12) h += 12;
                    if (m[3]?.toUpperCase() === 'AM' && h === 12) h = 0;
                    return h * 60 + min;
                };
                return toMin(a.startTime) - toMin(b.startTime);
            });

            if (blocksForDay.length > 0) {
                blocksForDay.forEach(block => {
                    const specialty = block.specialty ? ` — ${block.specialty}` : '';
                    message += `  🩺 ${block.startTime} a ${block.endTime} — *Dr. ${block.doctorName}*${specialty}\n`;
                });
            }

            patients.forEach((p: any) => {
                const timeStr = p.controlDateObj?.toLocaleTimeString
                    ? p.controlDateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                    : "";
                const typeStr = p.isVisit
                    ? `✅ Asistió`
                    : p.treatmentType === "ortodoncia" ? "🦷 Ortodoncia" : "🏥 General";
                message += `  🕐 ${timeStr} — *${p.name}* (${typeStr})\n`;
                totalCitas++;
            });
            message += `\n`;
        });

        message += `Total: ${totalCitas} cita(s)`;
        return message;
    }, [items, selectedDate, specialistBlocks]);

    const shareToWhatsApp = useCallback(async () => {
        const message = buildAgendaMessage();

        if (!message) {
            dialog.alert("Sin citas", "No hay citas para compartir en este día.", "info");
            return;
        }

        const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                dialog.alert(
                    "WhatsApp no disponible",
                    "No se encontró WhatsApp instalado en el dispositivo.",
                    "error"
                );
            }
        } catch {
            dialog.alert("Error", "No se pudo abrir WhatsApp.", "error");
        }
    }, [buildAgendaMessage, dialog]);

    const renderItem = useCallback((patient: any, isFirst: boolean) => {
        if (!patient) return <View />;

        const timeString = patient.controlDateObj?.toLocaleTimeString
            ? patient.controlDateObj.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
              })
            : "";

        const isFinished = patient.isVisit || patient.hasAttended;

        return (
            <TouchableOpacity
                style={[styles.card, { marginTop: isFirst ? 20 : 0 }]}
                onPress={() => {
                    if (isFinished) {
                        router.push({
                            pathname: "/historial-visitas",
                            params: { id: patient.realId },
                        });
                    } else {
                        router.push({
                            pathname: "/registrar-pago",
                            params: { id: patient.realId },
                        });
                    }
                }}
                activeOpacity={0.7}
            >
                <View style={styles.timeColumn}>
                    <Text style={styles.timeText}>{timeString}</Text>
                    <View style={[styles.timelineDot, isFinished && { backgroundColor: Colors.success }]} />
                </View>
                <View style={styles.contentColumn}>
                    <View style={styles.nameRow}>
                        <Text style={styles.patientName} numberOfLines={1}>{patient.name}</Text>
                        {patient._syncStatus === 'pending' ? (
                            <View style={styles.syncBadgePending}>
                                <ActivityIndicator size={8} color="#FF8C00" />
                                <Text style={styles.syncBadgePendingText}>Pendiente</Text>
                            </View>
                        ) : patient._syncStatus === 'synced' ? (
                            <View style={styles.syncBadgeSynced}>
                                <Ionicons name="cloud-done-outline" size={10} color="#2E7D32" />
                                <Text style={styles.syncBadgeSyncedText}>En la nube</Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 4 }}>
                        <Text style={styles.treatmentText}>
                            <Ionicons name={isFinished ? "checkmark-circle" : "medical"} size={12} color={Colors.textSecondary} />{" "}
                            {isFinished 
                                ? `Asistió: ${patient.visitDetails || 'Visita registrada'}` 
                                : `${patient.treatmentType === "ortodoncia" ? "Ortodoncia (Pendiente)" : "General (Pendiente)"}`}
                        </Text>
                        
                        {patient.extraVisits && patient.extraVisits.map((ev: any, index: number) => (
                            <Fragment key={ev.id || index}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
                                    <Ionicons name="checkmark-circle" size={12} color={Colors.textSecondary} />
                                    <Text style={[styles.treatmentText, { color: Colors.textSecondary, marginLeft: 4 }]}>
                                     {ev.reason || ev.treatment || 'Procedimiento'}
                                    </Text>
                                </View>
                            </Fragment>
                        ))}
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.border} />
            </TouchableOpacity>
        );
    }, [router]);


    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.title}>Agenda</Text>
                    {pendingCount > 0 && (
                        <View style={styles.pendingBadge}>
                            <Ionicons name="cloud-upload-outline" size={11} color="#FF8C00" />
                            <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.whatsappButton}
                    onPress={shareToWhatsApp}
                    activeOpacity={0.7}
                >
                    <Ionicons name="logo-whatsapp" size={20} color="white" />
                    <Text style={styles.whatsappButtonText}>Enviar</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={{ padding: 16 }}><AgendaSkeleton /></View>
            ) : (
                <View style={{ flex: 1 }}>
                    <Calendar
                        current={selectedDate}
                        onDayPress={(day: any) => setSelectedDate(day.dateString)}
                        markedDates={{
                            [selectedDate]: { selected: true, selectedColor: Colors.primary },
                            ...Object.keys(items).reduce((acc: any, key) => {
                                if (items[key]?.length > 0 && key !== selectedDate) {
                                    acc[key] = { marked: true, dotColor: Colors.primary };
                                }
                                return acc;
                            }, {})
                        }}
                        theme={{
                            todayTextColor: Colors.primary,
                            selectedDayBackgroundColor: Colors.primary,
                            arrowColor: Colors.primary,
                        }}
                    />
                    
                    <ScrollView 
                        style={{ flex: 1, padding: 16 }}
                        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={handleRefresh} />}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={[styles.dateHeaderText, { marginBottom: 0, flex: 1 }]}>
                                {new Date(selectedDate + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                <TouchableOpacity 
                                    style={styles.addDoctorButton}
                                    onPress={() => router.push({ pathname: '/registrar-bloque-especialista', params: { date: selectedDate } })}
                                >
                                    <Ionicons name="medkit-outline" size={14} color="#4F46E5" />
                                    <Text style={styles.addDoctorText}>+ Doctor</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.addCitaButton}
                                    onPress={() => router.push({ pathname: '/seleccionar-paciente', params: { date: selectedDate } })}
                                >
                                    <Ionicons name="add" size={16} color={Colors.primary} />
                                    <Text style={styles.addCitaText}>Cita</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        {/* Bloques de Doctor Especialista */}
                        {activeSpecialistBlocks.length > 0 && (
                            <View style={{ marginBottom: 12 }}>
                                <Text style={styles.sectionHeaderTitle}>🩺 Doctor Especialista en Consultorio</Text>
                                {activeSpecialistBlocks.map((block) => (
                                    <TouchableOpacity
                                        key={block.id}
                                        style={styles.specialistCard}
                                        onPress={() => router.push({ pathname: '/registrar-bloque-especialista', params: { id: block.id } })}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.specialistHeaderRow}>
                                            <View style={styles.specialistBadge}>
                                                <Ionicons name="time" size={12} color="#4F46E5" />
                                                <Text style={styles.specialistBadgeText}>
                                                    {block.startTime} - {block.endTime} ({block.shiftTitle || "Reserva"})
                                                </Text>
                                            </View>
                                            <Ionicons name="create-outline" size={16} color="#6366F1" />
                                        </View>
                                        <Text style={styles.specialistDoctorName}>{block.doctorName}</Text>
                                        {block.specialty ? (
                                            <Text style={styles.specialistSubText}>Especialidad: {block.specialty}</Text>
                                        ) : null}
                                        {block.notes ? (
                                            <Text style={styles.specialistNotesText}>Notas: {block.notes}</Text>
                                        ) : null}
                                        <Text style={styles.specialistNotice}>
                                         Consultorio ocupado por el doctor (atiende a sus propios pacientes)
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <Text style={styles.sectionHeaderTitle}>👤 Citas de Pacientes Propios</Text>
                        {(!items[selectedDate] || items[selectedDate].length === 0) ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="calendar-clear-outline" size={48} color={Colors.border} />
                                <Text style={styles.emptyText}>No hay citas de pacientes propios para este día</Text>
                            </View>
                        ) : (
                            items[selectedDate].map((patient: any, index: number) => (
                                <Fragment key={patient.id || index}>
                                    {renderItem(patient, index === 0)}
                                </Fragment>
                            ))
                        )}
                        <View style={{ height: 40 }} />
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: Colors.text,
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FF8C00',
    },
    pendingBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FF8C00',
    },
    whatsappButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#25D366",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        gap: 6,
    },
    whatsappButtonText: {
        color: "white",
        fontWeight: "600",
        fontSize: 14,
    },
    dateHeaderText: {
        color: Colors.primary,
        fontWeight: "bold",
        textTransform: "capitalize",
        fontSize: 16,
        marginBottom: 16,
    },
    addCitaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    addCitaText: {
        color: Colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    card: {
        flexDirection: "row",
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginRight: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        alignItems: "center",
    },
    timeColumn: {
        width: 60,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    timeText: {
        fontSize: 14,
        fontWeight: "bold",
        color: Colors.primary,
        marginBottom: 4,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
    },
    contentColumn: {
        flex: 1,
    },
    patientName: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 4,
    },
    treatmentText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: Colors.textSecondary,
        fontWeight: "500",
        textAlign: "center",
        paddingHorizontal: 32,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
        gap: 8,
    },
    syncBadgePending: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#FFF3E0",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FF8C00",
    },
    syncBadgePendingText: {
        fontSize: 9,
        fontWeight: "700",
        color: "#FF8C00",
    },
    syncBadgeSynced: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "#E8F5E9",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#A5D6A7",
    },
    syncBadgeSyncedText: {
        fontSize: 9,
        fontWeight: "700",
        color: "#2E7D32",
    },
    addDoctorButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "#EEF2FF",
        borderWidth: 1,
        borderColor: "#C7D2FE",
    },
    addDoctorText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#4F46E5",
    },
    sectionHeaderTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 4,
    },
    specialistCard: {
        backgroundColor: "#F5F3FF",
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#C4B5FD",
        padding: 14,
        marginBottom: 12,
    },
    specialistHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    specialistBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#DDD6FE",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    specialistBadgeText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#4C1D95",
    },
    specialistDoctorName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#312E81",
        marginBottom: 2,
    },
    specialistSubText: {
        fontSize: 13,
        color: "#4338CA",
        fontWeight: "500",
    },
    specialistNotesText: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
        fontStyle: "italic",
    },
    specialistNotice: {
        fontSize: 11,
        color: "#4C1D95",
        marginTop: 6,
        fontWeight: "600",
    },
});
