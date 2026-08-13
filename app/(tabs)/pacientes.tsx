import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../shared/constants/Colors";
import { Patient } from "../../features/patients/types";
import { usePatientsStore } from "../../features/patients/store";
import { useAuthStore } from "../../features/auth/store";
import { useSyncStore } from "../../shared/stores/syncStore";
import { PatientCard } from "../../features/patients/components/PatientCard";
import { PatientListSkeleton } from "../../shared/components/SkeletonLoader";
import { SyncIndicator } from "../../shared/components/SyncIndicator";


export default function PatientsScreen() {
  const router = useRouter();
  const patients = usePatientsStore((s) => s.patients);
  const isLoading = usePatientsStore((s) => s.isLoading);
  const isFromCache = usePatientsStore((s) => s.isFromCache);
  const getPatientStats = usePatientsStore((s) => s.getPatientStats);
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const refetch = useSyncStore((s) => s.refetch);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ORTODONCIA" | "GENERAL" | "SCHEDULED" | "UNSCHEDULED" | "PENDING" | "SYNCED">("ALL");

  // Conteos de estado de sync
  const syncCounts = useMemo(() => {
    const pending = patients.filter((p) => p._syncStatus === "pending").length;
    const synced = patients.filter((p) => p._syncStatus !== "pending").length;
    return { pending, synced };
  }, [patients]);

  const sortedPatients = useMemo(() => {
    const valid = patients.filter((p) =>
      p &&
      typeof p.id === "string" && p.id.trim().length > 0 &&
      typeof p.name === "string" && p.name.trim().length > 0
    );
    
    let filtered = valid.filter((p) => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (activeFilter === "ORTODONCIA") {
      filtered = filtered.filter((p) => p.treatmentType === "ortodoncia");
    } else if (activeFilter === "GENERAL") {
      filtered = filtered.filter((p) => p.treatmentType === "general");
    } else if (activeFilter === "SCHEDULED") {
      filtered = filtered.filter((p) => !!p.nextControlDate);
    } else if (activeFilter === "UNSCHEDULED") {
      filtered = filtered.filter((p) => !p.nextControlDate);
    } else if (activeFilter === "PENDING") {
      filtered = filtered.filter((p) => p._syncStatus === "pending");
    } else if (activeFilter === "SYNCED") {
      filtered = filtered.filter((p) => p._syncStatus !== "pending");
    }

    const scheduled: Patient[] = [];
    const unscheduled: Patient[] = [];

    filtered.forEach((p) => {
      if (p.nextControlDate) {
        scheduled.push(p);
      } else {
        unscheduled.push(p);
      }
    });

    scheduled.sort((a, b) => {
      const dateA = new Date(a.nextControlDate!).getTime();
      const dateB = new Date(b.nextControlDate!).getTime();
      return dateA - dateB;
    });

    unscheduled.sort((a, b) => a.name.localeCompare(b.name));

    return [...scheduled, ...unscheduled];
  }, [patients, searchQuery, activeFilter]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    try {
      await refetch(userId);
    } catch {
      // Error handled in syncStore
    }
  }, [userId, refetch]);

  const renderPatient = useCallback(
    ({ item }: { item: Patient }) => {
      const stats = getPatientStats(item.id);
      return (
        <PatientCard
          item={item}
          isExpanded={expandedId === item.id}
          onToggle={toggleExpand}
          stats={stats}
        />
      );
    },
    [expandedId, toggleExpand, getPatientStats]
  );

  const keyExtractor = useCallback((item: Patient) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pacientes</Text>
          <View style={styles.countRow}>
            <Text style={styles.countText}>{patients.length} registrados</Text>
            {syncCounts.pending > 0 && (
              <View style={styles.pendingCountBadge}>
                <Ionicons name="cloud-offline-outline" size={11} color={Colors.warning} />
                <Text style={styles.pendingCountText}>
                  {syncCounts.pending} sin subir
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/registrar-paciente")}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Banner de datos desde caché */}
      {isFromCache && (
        <View style={styles.cacheBanner}>
          <Ionicons name="phone-portrait-outline" size={14} color={Colors.primary} />
          <Text style={styles.cacheBannerText}>
            Mostrando datos locales • Sincronizando...
          </Text>
        </View>
      )}

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContainer}>
          {[
            { id: "ALL", label: "Todos", icon: undefined },
            { id: "ORTODONCIA", label: "Ortodoncia", icon: undefined },
            { id: "GENERAL", label: "General", icon: undefined },
            { id: "SCHEDULED", label: "Próximos", icon: undefined }, 
            { id: "UNSCHEDULED", label: "Sin Cita", icon: undefined },
            { id: "SYNCED", label: `☁️ En Nube`, icon: undefined },
            { id: "PENDING", label: `📱 Pendientes${syncCounts.pending > 0 ? ` (${syncCounts.pending})` : ""}`, icon: undefined },
          ].map(filter => {
             const filterId = filter.id as typeof activeFilter;
             return (
               <TouchableOpacity 
                 key={filter.id}
                 style={[
                   styles.filterChip, 
                   activeFilter === filterId && styles.filterChipActive,
                   filter.id === "PENDING" && syncCounts.pending > 0 && styles.filterChipPending,
                   filter.id === "PENDING" && syncCounts.pending > 0 && activeFilter === filterId && styles.filterChipPendingActive,
                 ]}
                 onPress={() => setActiveFilter(filterId)}
               >
                 <Text style={[
                   styles.filterChipText, 
                   activeFilter === filterId && styles.filterChipTextActive,
                   filter.id === "PENDING" && syncCounts.pending > 0 && styles.filterChipTextPending,
                   filter.id === "PENDING" && syncCounts.pending > 0 && activeFilter === filterId && styles.filterChipTextActive,
                 ]}>
                   {filter.label}
                 </Text>
               </TouchableOpacity>
             );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <PatientListSkeleton />
      ) : (
        <FlatList
          data={sortedPatients}
          keyExtractor={keyExtractor}
          renderItem={renderPatient}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isSyncing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={activeFilter === "PENDING" ? "cloud-offline-outline" : "people-outline"} 
                size={64} 
                color={Colors.border} 
              />
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? "Sin resultados" 
                  : activeFilter === "PENDING" 
                    ? "Todo sincronizado ✅" 
                    : activeFilter === "SYNCED"
                      ? "No hay pacientes en la nube"
                      : "No hay pacientes"}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? `No se encontró "${searchQuery}"`
                  : activeFilter === "PENDING"
                    ? "Todos los pacientes están en la base de datos"
                    : activeFilter === "SYNCED"
                      ? "Los pacientes se subirán al tener conexión"
                      : "Presiona + Nuevo para agregar"}
              </Text>
            </View>
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
        />
      )}

      {/* Floating button for orthodontic reassignment */}
      {patients.some((p) => p && p.treatmentType === "ortodoncia") && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => router.push("/reasignar-ortodoncia")}
        >
          <Ionicons name="sync" size={24} color="white" />
          <Text style={styles.floatingButtonText}>Reasignar Ortodoncia</Text>
        </TouchableOpacity>
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
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  countText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  pendingCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.warning + "15",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pendingCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.warning,
  },
  addButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
  cacheBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary + "10",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary + "20",
  },
  cacheBannerText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500",
  },
  searchContainer: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.text,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filtersContainer: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipPending: {
    borderColor: Colors.warning,
    backgroundColor: Colors.warning + "10",
  },
  filterChipPendingActive: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: "white",
  },
  filterChipTextPending: {
    color: Colors.warning,
    fontWeight: "600",
  },
  list: {
    padding: 16,
    paddingBottom: 150,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  floatingButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
  },
});
