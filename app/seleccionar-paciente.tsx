import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useMemo } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useColors, useThemedStyles, type Palette } from "../shared/theme";
import { usePatientsStore } from "../features/patients/store";
import { AvatarInitials } from "../shared/components/AvatarInitials";

export default function SelectPatientScreen() {
    const router = useRouter();
    const { date } = useLocalSearchParams();
    const patients = usePatientsStore((s) => s.patients);
    const [searchQuery, setSearchQuery] = useState("");
    const colors = useColors();
    const styles = useThemedStyles(createStyles);

    const filteredPatients = useMemo(() => {
        if (!searchQuery.trim()) return patients;
        return patients.filter((p: any) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [patients, searchQuery]);

    const handleSelectPatient = (patientId: string) => {
        router.push({
            pathname: "/modificar-control",
            params: { id: patientId, date: date as string },
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar paciente..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="words"
                />
            </View>

            <FlatList
                data={filteredPatients}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={styles.listContainer}
                ListHeaderComponent={
                    <TouchableOpacity
                        style={[styles.patientCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary, marginBottom: 16 }]}
                        onPress={() => router.push({ pathname: '/registrar-paciente', params: { date: date as string } })}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: colors.primary }]} >
                            <Ionicons name="person-add" size={20} color="white" />
                        </View>
                        <View style={styles.patientInfo}>
                            <Text style={[styles.patientName, { color: colors.primary }]}>Crear Nuevo Paciente</Text>
                            <Text style={styles.patientPhone}>Registrar e iniciar cita</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                    </TouchableOpacity>
                }
                renderItem={({ item }: any) => (
                    <TouchableOpacity
                        style={styles.patientCard}
                        onPress={() => handleSelectPatient(item.id)}
                    >
                        <AvatarInitials name={item.name} size={40} />
                        <View style={styles.patientInfo}>
                            <Text style={styles.patientName}>{item.name}</Text>
                            <Text style={styles.patientPhone}>{item.phone || "Sin teléfono"}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.border} />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={48} color={colors.border} />
                        <Text style={styles.emptyText}>No se encontraron pacientes</Text>
                    </View>
                }
            />
        </View>
    );
}

const createStyles = (colors: Palette) =>
    StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        marginLeft: 8,
        fontSize: 16,
        color: colors.text,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    patientCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    patientInfo: {
        flex: 1,
        marginLeft: 12,
    },
    patientName: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
    },
    patientPhone: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 40,
    },
    emptyText: {
        color: colors.textSecondary,
        marginTop: 12,
        fontSize: 16,
    },
});
