import Papa from "papaparse";
import type { ImportResult } from "./types";

interface BirthdayCsvRow {
  matricula?: string;
  nombre?: string;
  fecha_nacimiento?: string;
  ingreso?: string;
}

interface AnniversaryCsvRow {
  matricula?: string;
  nombre?: string;
  fecha_ingreso?: string;
}

interface ExclusionCsvRow {
  matricula?: string;
  nombre?: string;
  tema?: string;
  mes?: string;
}

const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_DMY_RE = /^\d{2}\/\d{2}\/\d{4}$/;

/** Normalizes date to YYYY-MM-DD. Accepts YYYY-MM-DD or DD/MM/YYYY. */
function normalizeDate(val: string): string | null {
  if (DATE_ISO_RE.test(val)) {
    const [y, m, d] = val.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
      return val;
    }
  }
  if (DATE_DMY_RE.test(val)) {
    const [d, m, y] = val.split("/").map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  return null;
}

function isValidDate(val: string): boolean {
  return normalizeDate(val) !== null;
}

export function parseBirthdayCsv(csvText: string): {
  valid: { matricula: string; nombre: string; fecha_nacimiento: string; fecha_ingreso: string | null }[];
  errors: ImportResult["errors"];
} {
  const { data } = Papa.parse<BirthdayCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const valid: { matricula: string; nombre: string; fecha_nacimiento: string; fecha_ingreso: string | null }[] = [];
  const errors: ImportResult["errors"] = [];
  const seenMatriculas = new Set<string>();

  data.forEach((row, i) => {
    const rowNum = i + 2;
    const matricula = row.matricula?.trim();
    const nombre = row.nombre?.trim();
    const fecha = row.fecha_nacimiento?.trim();
    const ingreso = row.ingreso?.trim();

    if (!matricula) {
      errors.push({ row: rowNum, message: "Matrícula vacía" });
      return;
    }
    if (!nombre) {
      errors.push({ row: rowNum, message: "Nombre vacío" });
      return;
    }
    const fechaNorm = fecha ? normalizeDate(fecha) : null;
    if (!fechaNorm) {
      errors.push({
        row: rowNum,
        message: `Fecha inválida: "${fecha ?? ""}" — formato esperado: YYYY-MM-DD o DD/MM/YYYY`,
      });
      return;
    }
    if (seenMatriculas.has(matricula)) {
      errors.push({ row: rowNum, message: `Matrícula duplicada: ${matricula}` });
      return;
    }

    seenMatriculas.add(matricula);
    valid.push({
      matricula,
      nombre,
      fecha_nacimiento: fechaNorm,
      fecha_ingreso: ingreso ? normalizeDate(ingreso) : null,
    });
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
    const fechaNorm = fecha ? normalizeDate(fecha) : null;
    if (!fechaNorm) {
      errors.push({
        row: rowNum,
        message: `Fecha inválida: "${fecha ?? ""}" — formato esperado: YYYY-MM-DD o DD/MM/YYYY`,
      });
      return;
    }
    if (seenMatriculas.has(matricula)) {
      errors.push({ row: rowNum, message: `Matrícula duplicada: ${matricula}` });
      return;
    }

    seenMatriculas.add(matricula);
    valid.push({ matricula, nombre, fecha_ingreso: fechaNorm });
  });

  return { valid, errors };
}

export type ExclusionRecord = {
  matricula: string;
  tipo: "cumpleanos" | "aniversario";
};

/**
 * Parses a CSV of exclusions. Expected columns: MATRÍCULA, NOMBRE, TEMA, MES.
 * Only MATRÍCULA and TEMA are used. TEMA = "Cumpleaños" → cumpleanos, "Antigüedad" → aniversario.
 */
export function parseExclusionCsv(csvText: string): {
  valid: ExclusionRecord[];
  errors: ImportResult["errors"];
} {
  const { data } = Papa.parse<ExclusionCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) =>
      h
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
  });

  const valid: ExclusionRecord[] = [];
  const errors: ImportResult["errors"] = [];

  data.forEach((row, i) => {
    const rowNum = i + 2;
    const matricula = row.matricula?.trim();
    const temaRaw = row.tema?.trim();

    if (!matricula) {
      errors.push({ row: rowNum, message: "Matrícula vacía" });
      return;
    }
    if (!temaRaw) {
      errors.push({ row: rowNum, message: "Tema vacío" });
      return;
    }

    const temaNorm = temaRaw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    let tipo: "cumpleanos" | "aniversario";
    if (temaNorm.includes("cumpleano")) {
      tipo = "cumpleanos";
    } else if (temaNorm.includes("antigued")) {
      tipo = "aniversario";
    } else {
      errors.push({
        row: rowNum,
        message: `Tema no reconocido: "${temaRaw}" — esperado: Cumpleaños o Antigüedad`,
      });
      return;
    }

    valid.push({ matricula, tipo });
  });

  return { valid, errors };
}
