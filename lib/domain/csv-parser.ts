import Papa from "papaparse";
import type { ImportResult } from "./types";

interface BirthdayCsvRow {
  matricula?: string;
  nombre?: string;
  fecha_nacimiento?: string;
}

interface AnniversaryCsvRow {
  matricula?: string;
  nombre?: string;
  fecha_ingreso?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(val: string): boolean {
  if (!DATE_RE.test(val)) return false;
  const [y, m, d] = val.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

export function parseBirthdayCsv(csvText: string): {
  valid: { matricula: string; nombre: string; fecha_nacimiento: string }[];
  errors: ImportResult["errors"];
} {
  const { data } = Papa.parse<BirthdayCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const valid: { matricula: string; nombre: string; fecha_nacimiento: string }[] = [];
  const errors: ImportResult["errors"] = [];
  const seenMatriculas = new Set<string>();

  data.forEach((row, i) => {
    const rowNum = i + 2;
    const matricula = row.matricula?.trim();
    const nombre = row.nombre?.trim();
    const fecha = row.fecha_nacimiento?.trim();

    if (!matricula) {
      errors.push({ row: rowNum, message: "Matrícula vacía" });
      return;
    }
    if (!nombre) {
      errors.push({ row: rowNum, message: "Nombre vacío" });
      return;
    }
    if (!fecha || !isValidDate(fecha)) {
      errors.push({
        row: rowNum,
        message: `Fecha inválida: "${fecha ?? ""}" — formato esperado: YYYY-MM-DD`,
      });
      return;
    }
    if (seenMatriculas.has(matricula)) {
      errors.push({ row: rowNum, message: `Matrícula duplicada: ${matricula}` });
      return;
    }

    seenMatriculas.add(matricula);
    valid.push({ matricula, nombre, fecha_nacimiento: fecha });
  });

  return { valid, errors };
}

export function parseAnniversaryCsv(csvText: string): {
  valid: { matricula: string; nombre: string; fecha_ingreso: string }[];
  errors: ImportResult["errors"];
} {
  const { data } = Papa.parse<AnniversaryCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const valid: { matricula: string; nombre: string; fecha_ingreso: string }[] = [];
  const errors: ImportResult["errors"] = [];
  const seenMatriculas = new Set<string>();

  data.forEach((row, i) => {
    const rowNum = i + 2;
    const matricula = row.matricula?.trim();
    const nombre = row.nombre?.trim();
    const fecha = row.fecha_ingreso?.trim();

    if (!matricula) {
      errors.push({ row: rowNum, message: "Matrícula vacía" });
      return;
    }
    if (!nombre) {
      errors.push({ row: rowNum, message: "Nombre vacío" });
      return;
    }
    if (!fecha || !isValidDate(fecha)) {
      errors.push({
        row: rowNum,
        message: `Fecha inválida: "${fecha ?? ""}" — formato esperado: YYYY-MM-DD`,
      });
      return;
    }
    if (seenMatriculas.has(matricula)) {
      errors.push({ row: rowNum, message: `Matrícula duplicada: ${matricula}` });
      return;
    }

    seenMatriculas.add(matricula);
    valid.push({ matricula, nombre, fecha_ingreso: fecha });
  });

  return { valid, errors };
}
