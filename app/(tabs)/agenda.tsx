import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../shared/constants/Colors";
import { Patient } from "../../features/patients/types";
import { usePatientsStore } from "../../features/patients/store";

// Helper to format date
const formatDateKey = (date: Date) => {
    return date.toISOString().split("T")[0];
};

export default function AgendaScreen() {
    const router = useRouter();
    const patients = usePatientsStore((s) => s.patients);
    const [selectedDateFilter, setSelectedDateFilter] = useState<string>("TODAY");

    // Get appointments and group by date
    const agendaData = useMemo(() => {
        const upcoming: (Patient & { controlDateObj: Date })[] = [];

        patients.forEach((p) => {
            if (p.nextControlDate) {
                upcoming.push({ ...p, controlDateObj: new Date(p.nextControlDate) });
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

            if (selectedDateFilter === "TODAY") {
                return date.getTime() === today.getTime();
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

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() =>
                    router.push({
                        pathname: "/modificar-control",
                        params: { id: patient.id },
                    })
                }
                activeOpacity={0.7}
            >
                <View style={styles.timeColumn}>
                    <Text style={styles.timeText}>{timeString}</Text>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineLine} />
                </View>
                <View style={styles.contentColumn}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <Text style={styles.treatmentText}>
                        <Ionicons name="medical" size={12} color={Colors.textSecondary} />{" "}
                        {patient.treatmentType === "ortodoncia" ? "Ortodoncia" : "General"}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.border} />
            </TouchableOpacity>
        );
    };

    const sortedDates = Object.keys(groupedAgenda).sort();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Agenda</Text>
            </View>

            <View style={styles.filterContainer}>
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
    filterContainer: {
        flexDirection: "row",
        padding: 16,
        gap: 8,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
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
