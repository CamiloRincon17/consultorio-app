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
import { Colors } from "../shared/constants/Colors";
import { useApp } from "../context/AppContext";
import { AvatarInitials } from "../shared/components/AvatarInitials";

export default function SelectPatientScreen() {
    const router = useRouter();
    const { date } = useLocalSearchParams();
    const { patients } = useApp();
    const [searchQuery, setSearchQuery] = useState("");

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
                <Ionicons name="search" size={20} color={Colors.textSecondary} />
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
                        style={[styles.patientCard, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary, marginBottom: 16 }]}
                        onPress={() => router.push({ pathname: '/registrar-paciente', params: { date: date as string } })}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: Colors.primary }]} >
                            <Ionicons name="person-add" size={20} color="white" />
                        </View>
                        <View style={styles.patientInfo}>
                            <Text style={[styles.patientName, { color: Colors.primary }]}>Crear Nuevo Paciente</Text>
                            <Text style={styles.patientPhone}>Registrar e iniciar cita</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
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
                        <Ionicons name="chevron-forward" size={20} color={Colors.border} />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={48} color={Colors.border} />
                        <Text style={styles.emptyText}>No se encontraron pacientes</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        marginLeft: 8,
        fontSize: 16,
        color: Colors.text,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    patientCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
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
        color: Colors.text,
    },
    patientPhone: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 40,
    },
    emptyText: {
        color: Colors.textSecondary,
        marginTop: 12,
        fontSize: 16,
    },
});
