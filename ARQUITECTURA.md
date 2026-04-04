# 📋 Documentación Técnica — Consultorio App

> Última actualización: 30 de marzo de 2026

---

## Índice

1. [Stack Tecnológico](#-stack-tecnológico)
2. [Estructura del Proyecto](#-estructura-del-proyecto)
3. [Arquitectura y Flujo de Datos](#-arquitectura-y-flujo-de-datos)
4. [Componentes Compartidos](#-componentes-compartidos)
5. [Funciones de Negocio](#-funciones-de-negocio)
6. [Servicios](#-servicios)
7. [Convenciones de Código](#-convenciones-de-código)
8. [Guía para Agregar Nuevas Funcionalidades](#-guía-para-agregar-nuevas-funcionalidades)
9. [Historial de Migraciones Arquitectónicas](#-historial-de-migraciones-arquitectónicas)

---

## 🛠 Stack Tecnológico

| Tecnología | Versión | Rol |
|-----------|---------|-----|
| React Native | 0.81.5 | Framework móvil |
| Expo SDK | 54 | Herramientas y módulos nativos |
| Expo Router | v6 | Navegación file-based |
| TypeScript | 5.9 | Tipado estático |
| AsyncStorage | 2.2.0 | Persistencia local |
| expo-notifications | 0.32 | Notificaciones push |

---

## 📁 Estructura del Proyecto

```
consultorio-app/
│
├── app/                          ← Pantallas (Expo Router file-based)
│   ├── (tabs)/                   ← Tabs principales
│   │   ├── _layout.tsx           ← Configuración del Tab Navigator
│   │   ├── index.tsx             ← Dashboard / Resumen
│   │   ├── pacientes.tsx         ← Lista de pacientes
│   │   ├── agenda.tsx            ← Agenda de citas
│   │   └── finanzas.tsx          ← Módulo financiero
│   ├── _layout.tsx               ← Root layout + AppProvider
│   ├── registrar-paciente.tsx    ← Formulario nuevo paciente
│   ├── editar-paciente.tsx       ← Formulario editar paciente
│   ├── registrar-pago.tsx        ← Formulario registrar pago
│   ├── registrar-transaccion.tsx ← Formulario nueva transacción
│   ├── editar-transaccion.tsx    ← Formulario editar transacción
│   ├── historial-visitas.tsx     ← Historial de visitas por paciente
│   ├── modificar-control.tsx     ← Editar fecha de control
│   ├── reasignar-ortodoncia.tsx  ← Reasignación manual de ortodoncia
│   ├── historial-reasignaciones.tsx ← Historial de reasignaciones
│   ├── reporte-semanal.tsx       ← Reporte financiero semanal
│   ├── reporte-mensual.tsx       ← Reporte financiero mensual
│   └── configuracion.tsx         ← Configuración y backup
│
├── context/
│   └── AppContext.tsx            ← Orquestador de estado global (Context API)
│                                   Re-exporta tipos para compatibilidad con screens
│
├── features/                     ← Lógica de negocio por dominio
│   ├── patients/
│   │   ├── types.ts              ← Interfaces: Patient, Visit
│   │   └── patientCalculations.ts ← Funciones puras: stats, visitas
│   └── finance/
│       ├── types.ts              ← Interface: Transaction
│       └── financeCalculations.ts ← Funciones puras: resumen, dashboard
│
├── shared/                       ← Código compartido entre features y screens
│   ├── components/               ← Componentes UI reutilizables
│   │   ├── index.ts              ← Barrel de re-exports
│   │   ├── ScreenHeader.tsx      ← Header de pantalla con título + acción
│   │   ├── EmptyState.tsx        ← Estado vacío con ícono + texto
│   │   ├── StatCard.tsx          ← Tarjeta de estadística (dashboard)
│   │   ├── FormInput.tsx         ← Campo de formulario label + input
│   │   └── PrimaryButton.tsx     ← Botón primario con variantes
│   ├── types/
│   │   └── index.ts              ← Barrel de tipos públicos (re-exports)
│   ├── utils/
│   │   ├── formatCOP.ts          ← Formateo de moneda colombiana
│   │   └── generateId.ts         ← Generador de IDs únicos
│   └── constants/
│       └── Colors.ts             ← Paleta de colores de la app
│
├── services/                     ← Servicios de infraestructura externos
│   ├── NotificationService.ts    ← Notificaciones push (expo-notifications)
│   ├── AutoReassignService.ts    ← Reasignación automática de ortodoncia
│   └── storage/
│       └── migrations/
│           └── v1_transactionsToVisits.ts ← Migración de datos v1
│
├── constants/
│   └── Colors.ts                 ← ⚠️ Legacy. Usar shared/constants/Colors.ts
├── utils/
│   └── formatCOP.ts              ← ⚠️ Legacy. Usar shared/utils/formatCOP.ts
│
├── assets/                       ← Imágenes, íconos y fuentes
├── app.json                      ← Configuración Expo
├── eas.json                      ← Configuración EAS Build
└── tsconfig.json                 ← Configuración TypeScript
```

> [!NOTE]
> Las carpetas `constants/` y `utils/` en la raíz son **legacy**. Sus archivos fueron copiados a `shared/`. Se mantienen temporalmente para no romper imports existentes. En una próxima etapa se actualizarán todos los imports y se eliminarán las carpetas legacy.

---

## 🔄 Arquitectura y Flujo de Datos

```
Screens (app/)
     │
     │ useApp()
     ▼
AppContext.tsx ──── Orquestador
     │                │
     │                ├── features/finance/financeCalculations.ts
     │                ├── features/patients/patientCalculations.ts
     │                └── services/storage/migrations/v1_*
     │
     │ AsyncStorage (automático via useEffect)
     ▼
@react-native-async-storage
   STORAGE_KEY_PATIENTS
   STORAGE_KEY_TRANSACTIONS
```

### Claves de AsyncStorage

| Clave | Contenido |
|-------|-----------|
| `STORAGE_KEY_PATIENTS` | Array JSON de `Patient[]` |
| `STORAGE_KEY_TRANSACTIONS` | Array JSON de `Transaction[]` |
| `MIGRATION_TRANSACTIONS_TO_VISITS` | Flag de migración v1 (`"true"`) |

> [!WARNING]
> **Nunca cambies estas claves** sin escribir antes una migración en `services/storage/migrations/`. Cambiarlas sin migrar borrará los datos del usuario.

---

## 🧩 Componentes Compartidos

Todos los componentes viven en `shared/components/` y se importan así:

```tsx
import { ScreenHeader, EmptyState, StatCard, FormInput, PrimaryButton } from '../../shared/components';
```

### `ScreenHeader`

Header de pantalla con título y botón de acción opcional.

```tsx
// Con botón de acción
<ScreenHeader
  title="Pacientes"
  actionLabel="Nuevo"
  actionIcon="add"
  onAction={() => router.push('/registrar-paciente')}
/>

// Solo título
<ScreenHeader title="Agenda" />

// Con elemento personalizado a la derecha
<ScreenHeader
  title="Resumen"
  rightElement={<TouchableOpacity onPress={handleSettings}>...</TouchableOpacity>}
/>
```

### `EmptyState`

Estado vacío cuando una lista no tiene datos.

```tsx
<EmptyState
  icon="receipt-outline"
  title="Sin movimientos"
  subtitle="Registra tus ingresos y gastos"
/>
```

### `StatCard`

Tarjeta de estadística para el Dashboard.

```tsx
<StatCard
  title="Pacientes"
  value={42}
  icon="people"
  iconColor={Colors.primary}
  onPress={() => router.push('/(tabs)/pacientes')}
/>
```

### `FormInput`

Campo de formulario con etiqueta. Extiende todas las props de `TextInput`.

```tsx
<FormInput
  label="Nombre Completo"
  placeholder="Ej. Juan Pérez"
  value={name}
  onChangeText={setName}
  helperText="Usa nombre y apellido completos"
  autoFocus
/>

<FormInput
  label="Mensualidad ($)"
  placeholder="0"
  keyboardType="numeric"
  value={fee}
  onChangeText={setFee}
/>
```

### `PrimaryButton`

Botón principal con 3 variantes y estado de carga.

```tsx
<PrimaryButton label="Guardar" onPress={handleSave} />
<PrimaryButton label="Guardando..." onPress={handleSave} loading={true} />
<PrimaryButton label="Eliminar" onPress={handleDelete} variant="danger" />
<PrimaryButton label="Registrar Pago" onPress={handlePay} variant="success" />
```

---

## 📐 Funciones de Negocio

Estas funciones son **puras** (no dependen de React) y viven en `features/`.

### `features/finance/financeCalculations.ts`

```ts
// Calcula totales históricos de ingresos, gastos y balance
computeFinancialSummary(transactions) 
// → { income: number, expenses: number, balance: number }

// Calcula ingresos del mes actual y de la semana actual
computeDashboardStats(transactions)
// → { monthlyIncome: number, weeklyIncome: number }
```

### `features/patients/patientCalculations.ts`

```ts
// Calcula total pagado y número de visitas de un paciente
computePatientStats(patientId, patients, transactions)
// → { totalPaid: number, visitCount: number }

// Retorna las visitas de un paciente
getPatientVisits(patientId, patients)
// → Visit[]
```

---

## ⚙️ Servicios

### `NotificationService`

Gestiona las notificaciones push usando `expo-notifications`.

| Método | Descripción |
|--------|-------------|
| `requestPermissions()` | Solicita permisos al usuario |
| `scheduleAppointmentNotification(id, name, date)` | Programa notificación para una cita |
| `cancelAppointmentNotification(id)` | Cancela notificación de un paciente |
| `rescheduleAllNotifications(patients)` | Reagenda todas las notificaciones |

### `AutoReassignService`

Reasigna automáticamente las citas de ortodoncia mensualmente.

| Método | Descripción |
|--------|-------------|
| `checkAndRunAutoReassign(patients, updatePatient)` | Ejecuta la reasignación si corresponde |

### Migraciones (`services/storage/migrations/`)

| Archivo | Descripción |
|---------|-------------|
| `v1_transactionsToVisits.ts` | Convierte transacciones INCOME antiguas en registros de visita |

---

## 📏 Convenciones de Código

### Imports

```ts
// ✅ Correcto — importar tipos desde features/ o shared/types
import type { Patient } from '../../features/patients/types';
import type { Transaction } from '../../shared/types';

// ✅ Correcto — importar componentes desde el barrel
import { EmptyState, ScreenHeader } from '../../shared/components';

// ✅ Correcto — importar utilidades desde shared/
import { formatCOPShort } from '../../shared/utils/formatCOP';
import { generateId } from '../../shared/utils/generateId';

// ⚠️ Tolerable (legacy) — importar desde constants/ o utils/ raíz
import { Colors } from '../../constants/Colors';
```

### Generación de IDs

```ts
// ✅ Correcto
import { generateId } from '../shared/utils/generateId';
const id = generateId();

// ❌ Incorrecto — no usar directamente
const id = Math.random().toString(36).substr(2, 9);
```

### Nuevas migraciones de datos

Cuando cambies la estructura de datos en AsyncStorage:

1. Crear `services/storage/migrations/vN_descripcion.ts`
2. Seguir el mismo patrón de `v1_transactionsToVisits.ts`
3. Llamar la migración desde `AppContext.tsx` en el `useEffect` de migración
4. Usar una clave única de flag: `MIGRATION_V2_MI_CAMBIO`

---

## 🚀 Guía para Agregar Nuevas Funcionalidades

### Nueva pantalla

1. Crear `app/mi-pantalla.tsx`
2. Registrarla en `app/_layout.tsx` con `<Stack.Screen name="mi-pantalla" />`
3. Usar los componentes de `shared/components/` en lugar de reinventar UI
4. Acceder al estado global con `useApp()` desde `context/AppContext`

### Nuevo tipo de dato

1. Definir la interfaz en `features/<dominio>/types.ts`
2. Agregar el re-export en `shared/types/index.ts`
3. Si el campo se guardará en AsyncStorage, documentar la clave

### Nueva función de cálculo

1. Escribirla como función pura en `features/<dominio>/<dominio>Calculations.ts`
2. Exponerla en `AppContext.tsx` si las screens la necesitan vía `useApp()`

---

## 📜 Historial de Migraciones Arquitectónicas

### Etapa 1 — Reorganización de carpetas (30/03/2026)

**Objetivo:** Separar tipos y utilidades por dominio sin romper nada.

| Cambio | Detalle |
|--------|---------|
| Creación de `features/patients/types.ts` | Tipos `Patient`, `Visit` extraídos de `AppContext` |
| Creación de `features/finance/types.ts` | Tipo `Transaction` extraído de `AppContext` |
| Creación de `shared/types/index.ts` | Barrel de re-exports públicos |
| Creación de `shared/utils/generateId.ts` | Centralización de generación de IDs |
| Copia de `utils/formatCOP.ts` → `shared/utils/` | Preparación para mover imports |
| Copia de `constants/Colors.ts` → `shared/constants/` | Preparación para mover imports |
| `AppContext.tsx` actualizado | Importa tipos desde `features/`, re-exporta para compatibilidad |

**Impacto en datos:** ✅ Ninguno. Las claves de AsyncStorage no cambiaron.

---

### Etapa 2 — Extracción de lógica de negocio (30/03/2026)

**Objetivo:** Vaciar `AppContext.tsx` de lógica de negocio, dejándolo como orquestador.

| Cambio | Detalle |
|--------|---------|
| Creación de `features/finance/financeCalculations.ts` | `computeFinancialSummary()`, `computeDashboardStats()` |
| Creación de `features/patients/patientCalculations.ts` | `computePatientStats()`, `getPatientVisits()` |
| Creación de `services/storage/migrations/v1_transactionsToVisits.ts` | Migración aislada y testeable |
| `AppContext.tsx` reescrito | Delega cálculos a funciones puras; código reducido a orquestador |

**Impacto en datos:** ✅ Ninguno. La misma migración, mismas claves, mismo comportamiento.

---

### Etapa 3 — Componentes UI compartidos (30/03/2026)

**Objetivo:** Crear librería interna de componentes reutilizables para evitar duplicación de UI.

| Componente | Extraído de | Screens que pueden usarlo |
|-----------|-------------|--------------------------|
| `ScreenHeader` | `pacientes.tsx`, `finanzas.tsx`, `agenda.tsx`, `index.tsx` | Todas las pantallas con header |
| `EmptyState` | `finanzas.tsx`, `agenda.tsx` | Cualquier lista vacía |
| `StatCard` | `index.tsx` (dashboard) | Dashboard |
| `FormInput` | `registrar-paciente.tsx`, `editar-paciente.tsx` y otros formularios | Todos los formularios |
| `PrimaryButton` | Todos los formularios | Todos los formularios |

**Impacto en datos:** ✅ Ninguno. Solo creación de nuevos archivos, sin tocar screens ni AsyncStorage.

> [!TIP]
> Los componentes de `shared/components/` están listos para usarse. Para migrar una pantalla gradualmente, reemplaza sus bloques inline de Header, EmptyState, botones e inputs por los componentes del barrel.

---

### Etapa 4 — Limpieza de Dependencias Legacy (30/03/2026)

**Objetivo:** Eliminar carpetas legacy en la raíz y hacer que toda la app use los `shared/`.

| Cambio | Detalle |
|--------|---------|
| Actualización de imports | 14 archivos apuntados a `shared/constants/Colors.ts` y `shared/utils/formatCOP.ts` |
| Eliminación de carpetas | Carpetas `constants/` y `utils/` destruidas |

**Impacto en datos:** ✅ Ninguno.

---

### Etapa 5 — Refactorización de Vistas UI (Formularios) (30/03/2026)

**Objetivo:** Eliminar la repetición de código UI espagueti integrando los componentes compartidos.

| Componente | Detalle |
|--------|---------|
| `FormInput` y `PrimaryButton` | Implementados en: `registrar-paciente`, `editar-paciente`, `registrar-pago`, `registrar-transaccion`, `editar-transaccion`. |
| Limpieza de `StyleSheet` | Centenares de líneas de código CSS duplicado eliminadas. |

**Impacto en datos:** ✅ Ninguno.

---

### Etapa 6 — Extracción de Componentes de Dominio (30/03/2026)

**Objetivo:** Limpiar las vistas principales extrayendo las tarjetas complejas a la capa de features.

| Acción | Detalle |
|--------|---------|
| Extracción `PatientCard` | Lógica y UI de la tarjeta interactiva (con acordeón y acciones) se extrajeron a `features/patients/components/PatientCard.tsx`. |
| Extracción `TransactionCard` | Tarjeta condicional de ingreso/gasto se extrajo a `features/finance/components/TransactionCard.tsx`. |
| Limpieza en `app/(tabs)` | Reducción dramática del código espagueti en `pacientes.tsx` y `finanzas.tsx`. |

**Impacto en datos:** ✅ Ninguno.

---

### Etapa 7 — Migración de Estado a Zustand (30/03/2026)

**Objetivo:** Reemplazar React Context global por Zustand para evitar *re-renders* innecesarios, separar la lógica de negocio y aumentar el rendimiento de la aplicación.

| Acción | Detalle |
|--------|---------|
| Nuevos Stores | Se crearon `usePatientsStore` y `useFinanceStore` en sus respectivas carpetas de dominio. |
| AppProvider Refactorizado | El archivo `AppContext.tsx` ahora sirve **únicamente como hidratador** del almacenamiento `AsyncStorage` hacia Zustand en el arranque. |
| Compatibilidad Total (`useApp`) | Se mantuvo expuesto el hook `useApp` como un adaptador (wrapper) que unifica ambos *stores* Zustand, preservando el 100% del código en las vistas existentes. |

**Impacto en datos:** ✅ Ninguno. Persistencia sigue siendo transparente mediante `AsyncStorage` idénticamente al esquema de la Etapa 1.

---

### Etapa 8 — Refactorización de Vistas Principales (Tabs) a Zustand (30/03/2026)

**Objetivo:** Eliminar el uso del wrapper `useApp` en las vistas más pesadas de la aplicación para exprimir al máximo el rendimiento de Zustand.

| Cambios | Detalle |
|---------|---------|
| `index.tsx` (Dashboard) | Migrado para consumir `usePatientsStore` y `useFinanceStore` atómicamente. |
| `pacientes.tsx` | Añadido Buscador en Tiempo Real y Filtros interactivos. Migrado a `usePatientsStore`. |
| `agenda.tsx` | Migrado a `usePatientsStore`. |
| `finanzas.tsx` | Migrado a `useFinanceStore` para transacciones, y `usePatientsStore` para mapeo de nombres. |

---

### Etapa 9 — Seguridad de Acceso con PIN (30/03/2026)

**Objetivo:** Proteger información privada de manera nativa sin usar dependencias biométricas para mayor compatibilidad, utilizando un sistema de `AuthStore` con Zustand.

| Cambios | Detalle |
|---------|---------|
| `features/auth/store.ts` | Almacenamiento independiente encargado de validar llaves y la persistencia del PIN de 4 dígitos. |
| `features/auth/components/PinLockScreen.tsx` | Un teclado numérico visual que bloquea el inicio de la app a través del `AppContext.tsx`. |
| `configuracion.tsx` | Añadida sección dentro de Ajustes para Revocar / Quitar el PIN existente bajo la capa Zustand. |
