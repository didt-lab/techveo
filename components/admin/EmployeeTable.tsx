"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Empleado } from "@/lib/domain/types";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? "bg-emerald-600" : "bg-gray-600"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

const MESES = [
  { value: "", label: "Todos los meses" },
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

function getMonth(dateStr: string): number {
  const parts = dateStr.split("-");
  return parts.length >= 2 ? parseInt(parts[1], 10) : 0;
}

/** Returns "MM-DD" for month-day sorting */
function getMonthDay(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length < 3) return "00-00";
  return `${parts[1]}-${parts[2]}`;
}

type SortField = "nombre" | "fecha_nacimiento" | "fecha_ingreso" | "matricula";
type SortDir = "asc" | "desc";

export function EmployeeTable({ empleados }: { empleados: Empleado[] }) {
  const [search, setSearch] = useState("");
  const [mesCumple, setMesCumple] = useState("");
  const [mesIngreso, setMesIngreso] = useState("");
  const [sortField, setSortField] = useState<SortField>("nombre");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();

  async function toggleField(emp: Empleado, field: "mostrar_cumpleanos" | "mostrar_aniversario") {
    setUpdating(`${emp.id}-${field}`);
    await fetch(`/api/empleados/${emp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matricula: emp.matricula,
        nombre: emp.nombre,
        fecha_nacimiento: emp.fecha_nacimiento,
        fecha_ingreso: emp.fecha_ingreso,
        foto_url: emp.foto_url,
        [field]: !emp[field],
      }),
    });
    setUpdating(null);
    router.refresh();
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const filtered = empleados
    .filter(
      (e) =>
        e.nombre.toLowerCase().includes(search.toLowerCase()) ||
        e.matricula.toLowerCase().includes(search.toLowerCase())
    )
    .filter((e) => (mesCumple ? getMonth(e.fecha_nacimiento) === parseInt(mesCumple, 10) : true))
    .filter((e) => (mesIngreso ? getMonth(e.fecha_ingreso) === parseInt(mesIngreso, 10) : true))
    .sort((a, b) => {
      let cmp: number;
      if (sortField === "fecha_nacimiento" || sortField === "fecha_ingreso") {
        // Sort by month-day only (MM-DD) to see upcoming dates
        const mdA = getMonthDay(a[sortField]);
        const mdB = getMonthDay(b[sortField]);
        cmp = mdA.localeCompare(mdB);
      } else {
        cmp = a[sortField].localeCompare(b[sortField]);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre o matrícula…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white w-72 focus:outline-none focus:border-white/30"
        />
        <select
          value={mesCumple}
          onChange={(e) => setMesCumple(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30"
        >
          {MESES.map((m) => (
            <option key={`cumple-${m.value}`} value={m.value}>
              {m.value ? m.label : "Mes cumpleaños"}
            </option>
          ))}
        </select>
        <select
          value={mesIngreso}
          onChange={(e) => setMesIngreso(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30"
        >
          {MESES.map((m) => (
            <option key={`ingreso-${m.value}`} value={m.value}>
              {m.value ? m.label : "Mes ingreso"}
            </option>
          ))}
        </select>
        {(mesCumple || mesIngreso) && (
          <button
            onClick={() => { setMesCumple(""); setMesIngreso(""); }}
            className="px-3 py-2 text-white/50 hover:text-white text-sm transition-colors"
          >
            Limpiar filtros
          </button>
        )}
        <a
          href="/admin/empleados/nuevo"
          className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold transition-colors"
        >
          + Nuevo empleado
        </a>
      </div>

      <div className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-sm uppercase tracking-wider">
              <th className="px-6 py-3 cursor-pointer hover:text-white/80 select-none" onClick={() => handleSort("matricula")}>
                <span className="flex items-center gap-1">
                  Matrícula
                  <span className={`flex flex-col text-[10px] leading-none ${sortField === "matricula" ? "text-white" : "text-white/20"}`}>
                    <span className={sortField === "matricula" && sortDir === "asc" ? "text-emerald-400" : ""}>▲</span>
                    <span className={sortField === "matricula" && sortDir === "desc" ? "text-emerald-400" : ""}>▼</span>
                  </span>
                </span>
              </th>
              <th className="px-6 py-3 cursor-pointer hover:text-white/80 select-none" onClick={() => handleSort("nombre")}>
                <span className="flex items-center gap-1">
                  Nombre
                  <span className={`flex flex-col text-[10px] leading-none ${sortField === "nombre" ? "text-white" : "text-white/20"}`}>
                    <span className={sortField === "nombre" && sortDir === "asc" ? "text-emerald-400" : ""}>▲</span>
                    <span className={sortField === "nombre" && sortDir === "desc" ? "text-emerald-400" : ""}>▼</span>
                  </span>
                </span>
              </th>
              <th className="px-6 py-3 cursor-pointer hover:text-white/80 select-none" onClick={() => handleSort("fecha_nacimiento")}>
                <span className="flex items-center gap-1">
                  Cumpleaños
                  <span className={`flex flex-col text-[10px] leading-none ${sortField === "fecha_nacimiento" ? "text-white" : "text-white/20"}`}>
                    <span className={sortField === "fecha_nacimiento" && sortDir === "asc" ? "text-emerald-400" : ""}>▲</span>
                    <span className={sortField === "fecha_nacimiento" && sortDir === "desc" ? "text-emerald-400" : ""}>▼</span>
                  </span>
                </span>
              </th>
              <th className="px-6 py-3 cursor-pointer hover:text-white/80 select-none" onClick={() => handleSort("fecha_ingreso")}>
                <span className="flex items-center gap-1">
                  Fecha Ingreso
                  <span className={`flex flex-col text-[10px] leading-none ${sortField === "fecha_ingreso" ? "text-white" : "text-white/20"}`}>
                    <span className={sortField === "fecha_ingreso" && sortDir === "asc" ? "text-emerald-400" : ""}>▲</span>
                    <span className={sortField === "fecha_ingreso" && sortDir === "desc" ? "text-emerald-400" : ""}>▼</span>
                  </span>
                </span>
              </th>
              <th className="px-6 py-3">Foto</th>
              <th className="px-6 py-3 text-center">Mostrar Cumple</th>
              <th className="px-6 py-3 text-center">Mostrar Aniv.</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr
                key={emp.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="px-6 py-4 font-mono text-sm">{emp.matricula}</td>
                <td className="px-6 py-4">{emp.nombre}</td>
                <td className="px-6 py-4 text-white/70">{emp.fecha_nacimiento}</td>
                <td className="px-6 py-4 text-white/70">{emp.fecha_ingreso}</td>
                <td className="px-6 py-4">
                  {emp.foto_url ? (
                    <img
                      src={emp.foto_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white/30 text-sm">Sin foto</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <Toggle
                    checked={emp.mostrar_cumpleanos}
                    onChange={() => toggleField(emp, "mostrar_cumpleanos")}
                    disabled={updating === `${emp.id}-mostrar_cumpleanos`}
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <Toggle
                    checked={emp.mostrar_aniversario}
                    onChange={() => toggleField(emp, "mostrar_aniversario")}
                    disabled={updating === `${emp.id}-mostrar_aniversario`}
                  />
                </td>
                <td className="px-6 py-4">
                  <a
                    href={`/admin/empleados/${emp.id}/editar`}
                    className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
                  >
                    Editar
                  </a>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-white/30">
                  {search ? "Sin resultados" : "No hay empleados registrados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-white/30 text-sm mt-4">
        {filtered.length} de {empleados.length} empleados
      </p>
    </div>
  );
}
