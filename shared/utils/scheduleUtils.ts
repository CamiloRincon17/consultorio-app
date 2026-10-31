import { SpecialistBlock } from "../../features/specialists/types";
import { Patient } from "../../features/patients/types";
import { toLocalDateString } from "./dateUtils";

/**
 * Convierte una cadena de hora ("08:00 AM", "14:30", "08:00", etc.)
 * a minutos desde la medianoche (0 - 1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Convierte un objeto Date a minutos desde la medianoche local.
 */
export function dateToMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Verifica si dos rangos de tiempo [startA, endA) y [startB, endB) se solapan.
 */
export function doTimeRangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Verifica si la cita elegida para un paciente colisiona con algún bloque de especialista.
 * Se asume que la cita de paciente dura al menos 15 minutos o cae dentro de la franja del especialista.
 */
export function findSpecialistConflictForAppointment(
  appointmentDate: Date,
  specialistBlocks: SpecialistBlock[]
): SpecialistBlock | null {
  const dateStr = toLocalDateString(appointmentDate);
  const dayOfWeek = appointmentDate.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
  const appointmentMinutes = dateToMinutes(appointmentDate);

  for (const block of specialistBlocks) {
    let applies = false;
    if (block.isRecurring) {
      if (block.recurringDays && block.recurringDays.includes(dayOfWeek)) {
        applies = true;
      }
    } else if (block.date === dateStr) {
      applies = true;
    }

    if (applies) {
      const blockStart = parseTimeToMinutes(block.startTime);
      const blockEnd = parseTimeToMinutes(block.endTime);

      // Si la hora de la cita cae dentro del bloque del especialista (ej. 08:00 - 12:00)
      if (appointmentMinutes >= blockStart && appointmentMinutes < blockEnd) {
        return block;
      }
    }
  }

  return null;
}

/**
 * Verifica si el bloque de especialista colisiona con alguna cita de paciente ya agendada.
 */
export function findPatientConflictForSpecialistBlock(
  blockData: {
    id?: string;
    date?: string;
    isRecurring?: boolean;
    recurringDays?: number[];
    startTime: string;
    endTime: string;
  },
  patients: Patient[]
): { patientName: string; appointmentTime: string; dateLabel: string } | null {
  const blockStart = parseTimeToMinutes(blockData.startTime);
  const blockEnd = parseTimeToMinutes(blockData.endTime);

  for (const patient of patients) {
    const datesToCheck: string[] = [];
    if (patient.appointments && patient.appointments.length > 0) {
      patient.appointments.forEach((a) => {
        if (a.date && a.status !== 'cancelled') datesToCheck.push(a.date);
      });
    } else if (patient.nextControlDate) {
      datesToCheck.push(patient.nextControlDate);
    }

    for (const dateStr of datesToCheck) {
      const controlDateObj = new Date(dateStr);
      const patientDateStr = toLocalDateString(controlDateObj);
      const patientDayOfWeek = controlDateObj.getDay();

      let applies = false;
      if (blockData.isRecurring) {
        if (blockData.recurringDays && blockData.recurringDays.includes(patientDayOfWeek)) {
          // Solo aplica si la cita del paciente es a partir de hoy
          if (controlDateObj >= new Date(new Date().setHours(0, 0, 0, 0))) {
            applies = true;
          }
        }
      } else if (blockData.date && blockData.date === patientDateStr) {
        applies = true;
      }

      if (applies) {
        const patientMinutes = dateToMinutes(controlDateObj);
        if (patientMinutes >= blockStart && patientMinutes < blockEnd) {
          const timeFormatted = controlDateObj.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
          return {
            patientName: patient.name,
            appointmentTime: timeFormatted,
            dateLabel: patientDateStr,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Ordena bloques de especialista cronológicamente por hora de inicio.
 */
export function sortSpecialistBlocksByTime(blocks: SpecialistBlock[]): SpecialistBlock[] {
  return [...blocks].sort((a, b) => {
    return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
  });
}

/**
 * Ordena citas de pacientes cronológicamente por hora de cita.
 */
export function sortPatientsByTime<T extends { controlDateObj?: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const timeA = a.controlDateObj ? dateToMinutes(a.controlDateObj) : 0;
    const timeB = b.controlDateObj ? dateToMinutes(b.controlDateObj) : 0;
    return timeA - timeB;
  });
}
