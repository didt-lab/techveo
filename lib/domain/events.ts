import { getMonth, getDate, getYear, addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import type { Empleado, BirthdayEvent, AnniversaryEvent, NewHireEvent } from "./types";

/**
 * Parse "YYYY-MM-DD" into { month (1-12), day (1-31), year }.
 * Never uses new Date("YYYY-MM-DD") to avoid timezone bugs.
 */
function parseDateString(dateStr: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Returns employees whose birthday falls within the next 15 days.
 */
export function getBirthdaysInWindow(
  empleados: Empleado[],
  referenceDate: Date = new Date()
): BirthdayEvent[] {
  const windowDays: { month: number; day: number }[] = [];
  for (let i = 0; i < 15; i++) {
    const d = addDays(referenceDate, i);
    windowDays.push({ month: getMonth(d) + 1, day: getDate(d) });
  }

  const results: BirthdayEvent[] = [];

  for (const emp of empleados) {
    const parsed = parseDateString(emp.fecha_nacimiento);
    if (!parsed) continue;

    const match = windowDays.find(
      (w) => w.month === parsed.month && w.day === parsed.day
    );
    if (match) {
      results.push({
        empleado: emp,
        fechaCumple: format(
          new Date(2000, match.month - 1, match.day),
          "d 'de' MMMM",
          { locale: es }
        ),
      });
    }
  }

  // Sort by how soon the birthday is
  results.sort((a, b) => {
    const pa = parseDateString(a.empleado.fecha_nacimiento)!;
    const pb = parseDateString(b.empleado.fecha_nacimiento)!;
    const idxA = windowDays.findIndex(
      (w) => w.month === pa.month && w.day === pa.day
    );
    const idxB = windowDays.findIndex(
      (w) => w.month === pb.month && w.day === pb.day
    );
    return idxA - idxB;
  });

  return results;
}

/**
 * Returns employees whose hire anniversary falls in the current month.
 */
export function getAnniversariesInMonth(
  empleados: Empleado[],
  referenceDate: Date = new Date()
): AnniversaryEvent[] {
  const currentMonth = getMonth(referenceDate) + 1;
  const currentYear = getYear(referenceDate);

  const results: AnniversaryEvent[] = [];

  for (const emp of empleados) {
    const parsed = parseDateString(emp.fecha_ingreso);
    if (!parsed) continue;

    if (parsed.month === currentMonth && parsed.year < currentYear) {
      const anos = currentYear - parsed.year;
      const milestones = [5, 10, 15, 20, 25, 35];
      if (milestones.includes(anos)) {
        results.push({
          empleado: emp,
          anosServicio: anos,
        });
      }
    }
  }

  // Sort by day of month
  results.sort((a, b) => {
    const pa = parseDateString(a.empleado.fecha_ingreso)!;
    const pb = parseDateString(b.empleado.fecha_ingreso)!;
    return pa.day - pb.day;
  });

  return results;
}

/**
 * Returns employees whose fecha_ingreso falls in the current month and year.
 */
export function getNewHiresInMonth(
  empleados: Empleado[],
  referenceDate: Date = new Date()
): NewHireEvent[] {
  const currentMonth = getMonth(referenceDate) + 1;
  const currentYear = getYear(referenceDate);

  const results: NewHireEvent[] = [];

  for (const emp of empleados) {
    const parsed = parseDateString(emp.fecha_ingreso);
    if (!parsed) continue;

    if (parsed.month === currentMonth && parsed.year === currentYear) {
      results.push({
        empleado: emp,
        fechaIngreso: format(
          new Date(2000, parsed.month - 1, parsed.day),
          "d 'de' MMMM",
          { locale: es }
        ),
      });
    }
  }

  // Sort by fecha_ingreso descending (most recent first)
  results.sort((a, b) => {
    const pa = parseDateString(a.empleado.fecha_ingreso)!;
    const pb = parseDateString(b.empleado.fecha_ingreso)!;
    return pb.day - pa.day;
  });

  return results;
}
