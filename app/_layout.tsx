import { Stack } from "expo-router";
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { AppProvider, useApp } from "../context/AppContext";
import { NotificationService } from "../services/NotificationService";
import { DialogProvider } from "../shared/context/DialogContext";

// Prevenir que el Splash se oculte automáticamente
// Se ocultará manualmente en AppProvider cuando auth/datos estén listos
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  const { patients } = useApp();

  useEffect(() => {
    // Initialize notifications when app starts
    const initNotifications = async () => {
      try {
        // Request permissions
        const hasPermission = await NotificationService.requestPermissions();

        if (hasPermission) {
          console.log("🔔 Initializing notification system...");

          // Reschedule all notifications in case app was reinstalled
          await NotificationService.rescheduleAllNotifications(patients);

          console.log("✅ Notification system initialized");
        } else {
          console.log("⚠️ Notification permissions not granted");
        }
      } catch (error) {
        console.error("❌ Error initializing notifications:", error);
      }
    };

    initNotifications();
  }, []); // Run once on mount

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="registrar-paciente"
        options={{
          presentation: "modal",
          title: "Nuevo Paciente",
          headerShown: true,
          headerBackTitle: "Cancelar",
        }}
      />
      <Stack.Screen
        name="registrar-transaccion"
        options={{
          presentation: "modal",
          title: "Nueva Transacción",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="registrar-pago"
        options={{
          presentation: "modal",
          title: "Registrar Pago",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="modificar-control"
        options={{
          presentation: "modal",
          title: "Editar Control",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="editar-paciente"
        options={{
          presentation: "modal",
          title: "Editar Paciente",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="editar-transaccion"
        options={{
          presentation: "modal",
          title: "Editar Transacción",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="configuracion"
        options={{
          presentation: "modal",
          title: "Configuración",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="reasignar-ortodoncia"
        options={{
          presentation: "modal",
          title: "Reasignar Ortodoncia",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="historial-reasignaciones"
        options={{
          presentation: "modal",
          title: "Historial de Reasignaciones",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="reporte-semanal"
        options={{
          presentation: "modal",
          title: "Reporte Semanal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="reporte-mensual"
        options={{
          presentation: "modal",
          title: "Reporte Mensual",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="historial-visitas"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="seleccionar-paciente"
        options={{
          presentation: "modal",
          title: "Seleccionar Paciente",
          headerShown: true,
          headerBackTitle: "Atrás",
        }}
      />
      <Stack.Screen
        name="registrar-bloque-especialista"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <DialogProvider>
        <RootLayoutNav />
      </DialogProvider>
    </AppProvider>
  );
}
