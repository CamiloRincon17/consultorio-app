import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Patient, useApp } from '../../context/AppContext';
import { formatCOPShort } from '../../utils/formatCOP';

function getNextControlDate(patient: Patient): Date {
    if (patient.nextControlDate) {
        const date = new Date(patient.nextControlDate);
        // Validate the date is valid
        if (isNaN(date.getTime())) {
            return new Date(); // Return current date as fallback
        }
        return date;
    }

    const start = new Date(patient.startDate);
    // Validate start date is valid
    if (isNaN(start.getTime())) {
        return new Date(); // Return current date as fallback
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Check if birthday/start day has passed this month
    let nextControl = new Date(currentYear, currentMonth, start.getDate());
    if (nextControl < today) {
        nextControl = new Date(currentYear, currentMonth + 1, start.getDate());
    }
    return nextControl;
}

const PatientCard = ({ item, isExpanded, onToggle, stats }: { item: Patient, isExpanded: boolean, onToggle: (id: string) => void, stats: { totalPaid: number, visitCount: number } }) => {
    const router = useRouter();

    // Defensive checks to prevent crashes
    if (!item || !item.id || !item.name) {
        return null; // Don't render if data is invalid
    }

    const nextControl = getNextControlDate(item);
    const formattedDate = nextControl.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

    return (
        <View style={styles.card}>
            <TouchableOpacity
                onPress={() => onToggle(item.id)}
                activeOpacity={0.7}
                style={styles.cardTouchable}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardAvatar}>
                        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.patientName}>{item.name}</Text>
                        <View style={styles.detailRow}>
                            <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                            <Text style={styles.controlDate}> Próximo: {formattedDate}</Text>
                        </View>
                    </View>
                    <View style={styles.cardRight}>
                        <Text style={styles.monthlyFee}>{formatCOPShort(item.monthlyFee || 0)}</Text>
                    </View>
                </View>
            </TouchableOpacity>

            {isExpanded ? (
                <View style={styles.expandedContent}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Total Pagado</Text>
                            <Text style={styles.statValue}>{formatCOPShort(stats?.totalPaid || 0)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Visitas</Text>
                            <Text style={styles.statValue}>{stats?.visitCount || 0}</Text>
                        </View>
                    </View>

                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push({ pathname: '/modificar-control', params: { id: item.id } })}
                        >
                            <Ionicons name="time-outline" size={20} color={Colors.primary} />
                            <Text style={styles.actionText}>Cita</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push({ pathname: '/editar-paciente', params: { id: item.id } })}
                        >
                            <Ionicons name="create-outline" size={20} color={Colors.textSecondary} />
                            <Text style={styles.actionText}>Editar Info</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}
        </View>
    );
};

export default function PatientsScreen() {
    const router = useRouter();
    const { patients, getPatientStats } = useApp();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Filter out invalid patients to prevent blank cards
    const validPatients = patients.filter(p => p && p.id && p.name);

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Pacientes</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => router.push('/registrar-paciente')}
                >
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={styles.addButtonText}>Nuevo</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={validPatients}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                    const stats = getPatientStats(item.id);
                    return (
                        <PatientCard
                            item={item}
                            isExpanded={expandedId === item.id}
                            onToggle={toggleExpand}
                            stats={stats}
                        />
                    );
                }}
                contentContainerStyle={styles.list}
                extraData={expandedId}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
    },
    addButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 4,
    },
    addButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    list: {
        padding: 16,
        gap: 12,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
    cardTouchable: {
        width: '100%',
    },
    cardExpanded: {
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    cardAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    cardContent: {
        flex: 1,
    },
    patientName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlDate: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    monthlyFee: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.success,
    },
    expandedContent: {
        padding: 16,
        backgroundColor: '#F9F9F9',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    statItem: {
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 8,
        minWidth: 100,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 12,
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'center',
    },
    actionText: {
        color: Colors.text,
        fontWeight: '500',
        fontSize: 14,
    }
});
