/**
 * Converts any date input (Date object, ISO string, or YYYY-MM-DD string)
 * to a local YYYY-MM-DD string WITHOUT timezone drift.
 *
 * Problem: new Date("2026-04-18").toISOString() in UTC-5 returns "2026-04-17T19:00:00Z"
 * which when split on "T" gives the WRONG day.
 *
 * This function always uses the local year/month/day, so it works regardless of timezone.
 */
export function toLocalDateString(input: string | Date): string {
    const d = typeof input === 'string' ? new Date(input) : input;

    // If the input is a bare YYYY-MM-DD string (no time component), Date() parses it
    // as UTC midnight. We must detect this and avoid adding UTC offset twice.
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        // Already a local date string — return as is.
        return input;
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Checks if two date inputs refer to the same calendar day (local time).
 */
export function isSameLocalDay(a: string | Date, b: string | Date): boolean {
    return toLocalDateString(a) === toLocalDateString(b);
}

/**
 * Returns today's date as a local YYYY-MM-DD string.
 */
export function todayLocalString(): string {
    return toLocalDateString(new Date());
}

/**
 * Finds a visit that "covers" a scheduled appointment date.
 *
 * A visit covers an appointment if:
 *   1. It was registered on the SAME day as the appointment (standard case), OR
 *   2. It was registered BEFORE the appointment date (advance payment),
 *      but no earlier than 90 days before (to avoid false matches from old visits).
 *
 * Returns the most recent qualifying visit, or undefined if none found.
 *
 * @param visits - Array of visits for a patient
 * @param appointmentDate - The scheduled appointment date (YYYY-MM-DD or ISO string)
 */
export function findVisitForAppointment(
    visits: { date: string; reason?: string; treatment?: string; paid?: boolean }[],
    appointmentDate: string
): typeof visits[0] | undefined {
    if (!visits || visits.length === 0) return undefined;

    const apptLocal = toLocalDateString(appointmentDate);

    // Window: only consider visits registered within the 7 days BEFORE or ON the appointment
    // (A larger window like 90 days would accidentally mark next month's appointment as paid
    // because the visit from the previous month would fall within that window).
    const apptDateObj = new Date(apptLocal + 'T00:00:00');
    const windowStart = new Date(apptDateObj);
    windowStart.setDate(windowStart.getDate() - 7);
    const windowStartStr = toLocalDateString(windowStart);

    // Filter visits that fall within [windowStart, appointmentDate] AND are actually controls
    const qualifying = visits.filter(v => {
        const vDate = toLocalDateString(v.date);
        const inWindow = vDate >= windowStartStr && vDate <= apptLocal;
        
        // Verifica que la visita sea efectivamente por un control y no por otro procedimiento
        const isControl = /control|mensual|mensualidad/i.test(v.reason || '') ||
                          /control|mensual|mensualidad/i.test(v.treatment || '');
                          
        return inWindow && isControl;
    });

    if (qualifying.length === 0) return undefined;

    // Return the most recent qualifying visit
    return qualifying.reduce((latest, v) =>
        toLocalDateString(v.date) >= toLocalDateString(latest.date) ? v : latest
    );
}
