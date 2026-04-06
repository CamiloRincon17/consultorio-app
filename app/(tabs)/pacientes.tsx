import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
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
import { PatientCard } from "../../features/patients/components/PatientCard";


export default function PatientsScreen() {
  const router = useRouter();
  const patients = usePatientsStore((s) => s.patients);
  const getPatientStats = usePatientsStore((s) => s.getPatientStats);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ORTODONCIA" | "GENERAL" | "SCHEDULED" | "UNSCHEDULED">("ALL");

  // Filter and Sort:
  // 1. Filter by search query
  // 2. Filter by active filter (treatment type or schedule)
  // 3. Scheduled - Ascending Date
  // 4. Unscheduled - Ascending Name
  const sortedPatients = useMemo(() => {
    // Filtro agresivo: requiere name e id no vacíos incluso con trim
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

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => {
      if (prev === id) {
        return null;
      }
      return id;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pacientes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/registrar-paciente")}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

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
            { id: "ALL", label: "Todos" },
            { id: "ORTODONCIA", label: "Ortodoncia" },
            { id: "GENERAL", label: "General" },
            { id: "SCHEDULED", label: "Sin Cita", check: "UNSCHEDULED" }, 
            { id: "UNSCHEDULED", label: "Próximos", check: "SCHEDULED" },
          ].map(filter => {
             const filterId = filter.check || filter.id;
             return (
               <TouchableOpacity 
                 key={filter.id}
                 style={[styles.filterChip, activeFilter === filterId && styles.filterChipActive]}
                 onPress={() => setActiveFilter(filterId as any)}
               >
                 <Text style={[styles.filterChipText, activeFilter === filterId && styles.filterChipTextActive]}>
                   {filter.label}
                 </Text>
               </TouchableOpacity>
             );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      >
        {sortedPatients.map((item) => {
          const stats = getPatientStats(item.id);
          return (
            <PatientCard
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={toggleExpand}
              stats={stats}
            />
          );
        })}
      </ScrollView>

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
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: "white",
  },
  list: {
    padding: 16,
    paddingBottom: 100,
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
