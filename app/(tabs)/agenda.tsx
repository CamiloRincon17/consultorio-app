import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../shared/constants/Colors";
import { isSameLocalDay, toLocalDateString, findVisitForAppointment } from "../../shared/utils/dateUtils";
import { formatCOPShort } from "../../shared/utils/formatCOP";
import { Patient, Visit } from "../../features/patients/types";
import { usePatientsStore } from "../../features/patients/store";
import { useDialog } from "../../shared/context/DialogContext";

// Helper to format date key using LOCAL time (no UTC drift)
const formatDateKey = (date: Date): string => toLocalDateString(date);

export default function AgendaScreen() {
    const router = useRouter();
    const dialog = useDialog();
    const patients = usePatientsStore((s) => s.patients);
    const [selectedDateFilter, setSelectedDateFilter] = useState<string>("TODAY");

    // Get appointments and group by date
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

                // Use the same 7-day window logic as findVisitForAppointment to find ALL visits near the appointment
                const controlDateObj = new Date(controlLocal + 'T00:00:00');
                const windowStart = new Date(controlDateObj);
                windowStart.setDate(windowStart.getDate() - 7);
                const windowStartStr = toLocalDateString(windowStart);

                const windowVisits = (p.visits || []).filter(v => {
                    const vDate = toLocalDateString(v.date);
                    return vDate >= windowStartStr && vDate <= controlLocal;
                });

                // Separate controls from extra procedures
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
                        id: `${p.id}-visit-${v.id}`, // Unique ID for key mapping
                        realId: p.id,
                        controlDateObj: new Date(v.date),
                        isVisit: true,
                        visitDetails: v.reason || v.treatment || "Visita",
                    });
                });
            }
        });

        // Sort by date and time
        upcoming.sort((a, b) => a.controlDateObj.getTime() - b.controlDateObj.getTime());
        return upcoming;
    }, [patients]);

    const filteredAgenda = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return agendaData.filter((p) => {
            const date = new Date(
                p.controlDateObj.getFullYear(),
                p.controlDateObj.getMonth(),
                p.controlDateObj.getDate()
            );

            if (selectedDateFilter === "LAST_30") {
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(today.getDate() - 30);
                return date >= thirtyDaysAgo && date < today;
            }

            if (p.isVisit) {
                return false; // Ocultar visitas del historial en vistas futuras
            }

            if (selectedDateFilter === "TODAY") {
                return date.getTime() === today.getTime();
            } else if (selectedDateFilter === "TOMORROW") {
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                return date.getTime() === tomorrow.getTime();
            } else if (selectedDateFilter === "WEEK") {
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                return date >= today && date <= nextWeek;
            }
            return date >= today; // ALL future
        });
    }, [agendaData, selectedDateFilter]);

    const groupedAgenda = useMemo(() => {
        const groups: { [key: string]: typeof filteredAgenda } = {};
        filteredAgenda.forEach((p) => {
            const dateKey = formatDateKey(p.controlDateObj);
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(p);
        });
        return groups;
    }, [filteredAgenda]);

    const AppointmentCard = ({ patient }: { patient: typeof agendaData[0] }) => {
        const timeString = patient.controlDateObj.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });

        const isFinished = patient.isVisit || patient.hasAttended;

        return (
            <TouchableOpacity
                style={styles.card}
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
                    <View style={[styles.timelineLine, isFinished && { backgroundColor: Colors.success + "30" }]} />
                
                </View>
                <View style={styles.contentColumn}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 4 }}>
                        <Text style={styles.treatmentText}>
                            <Ionicons name={isFinished ? "checkmark-circle" : "medical"} size={12} color={Colors.textSecondary} />{" "}
                            {isFinished 
                                ? `Asistió: ${patient.visitDetails || 'Visita registrada'}` 
                                : `${patient.treatmentType === "ortodoncia" ? "Ortodoncia (Pendiente)" : "General (Pendiente)"}`}
                        </Text>
                        
                        {/* Render extra procedures at the same height */}
                        {patient.extraVisits && patient.extraVisits.map(ev => (
                            <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
                                <Ionicons name="checkmark-circle" size={12} color={Colors.textSecondary} />
                                <Text style={[styles.treatmentText, { color: Colors.textSecondary, marginLeft: 4 }]}>
                                 {ev.reason || ev.treatment || 'Procedimiento'}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.border} />
            </TouchableOpacity>
        );
    };

    const sortedDates = Object.keys(groupedAgenda).sort((a, b) => {
        return selectedDateFilter === "LAST_30" ? b.localeCompare(a) : a.localeCompare(b);
    });

    const buildAgendaMessage = useCallback(() => {
        if (sortedDates.length === 0) {
            return "";
        }

        const filterLabel =
            selectedDateFilter === "TODAY" ? "Hoy" :
            selectedDateFilter === "TOMORROW" ? "Mañana" :
            selectedDateFilter === "WEEK" ? "Próximos 7 días" : "Todas";

        let message = `📋 *AGENDA DEL CONSULTORIO*\n`;
        message += `📅 Filtro: ${filterLabel}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        sortedDates.forEach((dateString) => {
            const dateObj = new Date(dateString + "T12:00:00Z");
            const dayName = dateObj.toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
            });

            message += `📌 *${dayName.charAt(0).toUpperCase() + dayName.slice(1)}*\n`;

            groupedAgenda[dateString].forEach((p) => {
                const timeStr = p.controlDateObj.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                });
                let typeStr = "";
                if (p.isVisit) {
                    typeStr = `✅ Asistió (${p.visitDetails})`;
                } else {
                    typeStr = p.treatmentType === "ortodoncia" ? "🦷 Ortodoncia" : "🏥 General";
                }
                message += `  🕐 ${timeStr} — *${p.name}* (${typeStr})\n`;
            });

            message += `\n`;
        });

        message += `Total: ${filteredAgenda.length} cita(s)`;
        return message;
    }, [sortedDates, groupedAgenda, filteredAgenda, selectedDateFilter]);

    const shareToWhatsApp = useCallback(async () => {
        const message = buildAgendaMessage();

        if (!message) {
            dialog.alert("Sin citas", "No hay citas para compartir con el filtro actual.", "info");
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
    }, [buildAgendaMessage]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Agenda</Text>
                <TouchableOpacity
                    style={styles.whatsappButton}
                    onPress={shareToWhatsApp}
                    activeOpacity={0.7}
                >
                    <Ionicons name="logo-whatsapp" size={20} color="white" />
                    <Text style={styles.whatsappButtonText}>Enviar</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filterContainerOuter}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            selectedDateFilter === "TODAY" && styles.filterButtonActive,
                        ]}
                        onPress={() => setSelectedDateFilter("TODAY")}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                selectedDateFilter === "TODAY" && styles.filterTextActive,
                            ]}
                        >
                            Hoy
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            selectedDateFilter === "TOMORROW" && styles.filterButtonActive,
                        ]}
                        onPress={() => setSelectedDateFilter("TOMORROW")}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                selectedDateFilter === "TOMORROW" && styles.filterTextActive,
                            ]}
                        >
                            Mañana
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            selectedDateFilter === "WEEK" && styles.filterButtonActive,
                        ]}
                        onPress={() => setSelectedDateFilter("WEEK")}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                selectedDateFilter === "WEEK" && styles.filterTextActive,
                            ]}
                        >
                            Próx. 7 días
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            selectedDateFilter === "ALL" && styles.filterButtonActive,
                        ]}
                        onPress={() => setSelectedDateFilter("ALL")}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                selectedDateFilter === "ALL" && styles.filterTextActive,
                            ]}
                        >
                            Todas
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            selectedDateFilter === "LAST_30" && styles.filterButtonActive,
                        ]}
                        onPress={() => setSelectedDateFilter("LAST_30")}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                selectedDateFilter === "LAST_30" && styles.filterTextActive,
                            ]}
                        >
                            Historial 30 días
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {sortedDates.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-clear-outline" size={64} color={Colors.border} />
                        <Text style={styles.emptyText}>No hay citas programadas</Text>
                    </View>
                ) : (
                    sortedDates.map((dateString) => {
                        const dateObj = new Date(dateString + "T12:00:00Z"); // Fix timezone shift
                        const dayName = dateObj.toLocaleDateString("es-ES", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                        });

                        return (
                            <View key={dateString} style={styles.dayGroup}>
                                <View style={styles.dateHeader}>
                                    <Text style={styles.dateHeaderText}>{dayName}</Text>
                                </View>
                                {groupedAgenda[dateString].map((p) => (
                                    <AppointmentCard key={p.id} patient={p} />
                                ))}
                            </View>
                        );
                    })
                )}
            </ScrollView>
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
    filterContainerOuter: {
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    filterContainer: {
        flexDirection: "row",
        padding: 16,
        gap: 8,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: Colors.background,
    },
    filterButtonActive: {
        backgroundColor: Colors.primary,
    },
    filterText: {
        color: Colors.textSecondary,
        fontWeight: "600",
    },
    filterTextActive: {
        color: "white",
    },
    list: {
        padding: 16,
        paddingBottom: 40,
    },
    dayGroup: {
        marginBottom: 24,
    },
    dateHeader: {
        backgroundColor: Colors.primary + "15",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: "flex-start",
        marginBottom: 12,
    },
    dateHeaderText: {
        color: Colors.primary,
        fontWeight: "bold",
        textTransform: "capitalize",
        fontSize: 14,
    },
    card: {
        flexDirection: "row",
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
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
    timelineLine: {
        position: "absolute",
        top: 32,
        bottom: -32,
        width: 2,
        backgroundColor: Colors.primary + "30",
        zIndex: -1,
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
    },
});
