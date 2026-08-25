"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Empleado } from "@/lib/domain/types";
import { PencilIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";

const PAGE_SIZE = 15;

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
        checked ? "bg-brand-primary" : "bg-gray-300"
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

const ANTIGUEDAD = [
  { value: "", label: "Antigüedad" },
  { value: "5", label: "5+ años" },
  { value: "10", label: "10+ años" },
  { value: "20", label: "20+ años" },
];

function getMonth(dateStr: string): number {
  const parts = dateStr.split("-");
  return parts.length >= 2 ? parseInt(parts[1], 10) : 0;
}

function getYearsOfService(fechaIngreso: string): number {
  const parts = fechaIngreso.split("-");
  if (parts.length < 1) return 0;
  const year = parseInt(parts[0], 10);
  return new Date().getFullYear() - year;
}

type SortField = "nombre" | "fecha_nacimiento" | "fecha_ingreso" | "matricula";
type SortDir = "asc" | "desc";

export function EmployeeTable({ empleados }: { empleados: Empleado[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [mesCumple, setMesCumple] = useState(searchParams.get("mc") ?? "");
  const [mesIngreso, setMesIngreso] = useState(searchParams.get("mi") ?? "");
  const [minAnios, setMinAnios] = useState(searchParams.get("ma") ?? "");
  const [sortField, setSortField] = useState<SortField>(
    (searchParams.get("sf") as SortField) || "nombre"
  );
  const [sortDir, setSortDir] = useState<SortDir>(
    (searchParams.get("sd") as SortDir) || "asc"
  );
  const [page, setPage] = useState(parseInt(searchParams.get("p") ?? "1", 10) || 1);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const syncUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (v) params.set(k, v);
        else params.delete(k);
      }
      router.replace(`/admin?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

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

  async function handleDelete(emp: Empleado) {
    if (!confirm(`¿Eliminar a ${emp.nombre}?`)) return;
    setDeleting(emp.id);
    await fetch(`/api/empleados/${emp.id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  function allFilters(overrides: Record<string, string> = {}) {
    return {
      q: search,
      mc: mesCumple,
      mi: mesIngreso,
      ma: minAnios,
      sf: sortField,
      sd: sortDir,
      p: String(page),
      ...overrides,
    };
  }

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
    syncUrl(allFilters({ q: val, p: "" }));
  }

  function handleMesCumple(val: string) {
    setMesCumple(val);
    setPage(1);
    syncUrl(allFilters({ mc: val, p: "" }));
  }

  function handleMesIngreso(val: string) {
    setMesIngreso(val);
    setPage(1);
    syncUrl(allFilters({ mi: val, p: "" }));
  }

  function handleMinAnios(val: string) {
    setMinAnios(val);
    setPage(1);
    syncUrl(allFilters({ ma: val, p: "" }));
  }

  function handleClearFilters() {
    setMesCumple("");
    setMesIngreso("");
    setMinAnios("");
    setPage(1);
    syncUrl(allFilters({ mc: "", mi: "", ma: "", p: "" }));
  }

  function handleSort(field: SortField) {
    let newDir: SortDir;
    if (sortField === field) {
      newDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      newDir = "asc";
    }
    setSortField(field);
    setSortDir(newDir);
    setPage(1);
    syncUrl(allFilters({ sf: field, sd: newDir, p: "" }));
  }

  function handlePage(p: number) {
    setPage(p);
    syncUrl(allFilters({ p: p === 1 ? "" : String(p) }));
  }

  const filtered = empleados
    .filter(
      (e) =>
        e.nombre.toLowerCase().includes(search.toLowerCase()) ||
        e.matricula.toLowerCase().includes(search.toLowerCase())
    )
    .filter((e) => (mesCumple ? getMonth(e.fecha_nacimiento) === parseInt(mesCumple, 10) : true))
    .filter((e) => (mesIngreso ? getMonth(e.fecha_ingreso) === parseInt(mesIngreso, 10) : true))
    .filter((e) => (minAnios ? getYearsOfService(e.fecha_ingreso) >= parseInt(minAnios, 10) : true))
    .sort((a, b) => {
      const cmp = a[sortField].localeCompare(b[sortField]);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Persist filtered order for prev/next navigation in edit form
  useEffect(() => {
    sessionStorage.setItem(
      "techveo:employee-order",
      JSON.stringify(filtered.map((e) => e.id))
    );
  }, [filtered]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre o matrícula…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 w-72 focus:outline-none focus:border-brand-secondary"
        />
        <select
          value={mesCumple}
          onChange={(e) => handleMesCumple(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-brand-secondary"
        >
          {MESES.map((m) => (
            <option key={`cumple-${m.value}`} value={m.value}>
              {m.value ? m.label : "Mes cumpleaños"}
            </option>
          ))}
        </select>
        <select
          value={mesIngreso}
          onChange={(e) => handleMesIngreso(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-brand-secondary"
        >
          {MESES.map((m) => (
            <option key={`ingreso-${m.value}`} value={m.value}>
              {m.value ? m.label : "Mes ingreso"}
            </option>
          ))}
        </select>
        <select
          value={minAnios}
          onChange={(e) => handleMinAnios(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-brand-secondary"
        >
          {ANTIGUEDAD.map((a) => (
            <option key={`ant-${a.value}`} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        {(mesCumple || mesIngreso || minAnios) && (
          <button
            onClick={handleClearFilters}
            className="px-3 py-2 text-gray-500 hover:text-gray-900 text-sm transition-colors"
          >
            Limpiar filtros
          </button>
        )}
        <a
          href="/admin/empleados/nuevo"
          className="ml-auto px-4 py-2 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-lg font-semibold text-sm transition-colors"
        >
          + Nuevo empleado
        </a>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-[#F4F7FC] text-[#404041] text-xs font-bold uppercase tracking-wider">
              <th className="px-5 py-3 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("matricula")}>
                <span className="flex items-center gap-1">
                  Matrícula
                  <span className={`flex flex-col text-[9px] leading-none ${sortField === "matricula" ? "text-gray-900" : "text-gray-300"}`}>
                    <span className={sortField === "matricula" && sortDir === "asc" ? "text-brand-secondary" : ""}>▲</span>
                    <span className={sortField === "matricula" && sortDir === "desc" ? "text-brand-secondary" : ""}>▼</span>
                  </span>
                </span>
              </th>
              <th className="px-5 py-3 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("nombre")}>
                <span className="flex items-center gap-1">
                  Nombre
                  <span className={`flex flex-col text-[9px] leading-none ${sortField === "nombre" ? "text-gray-900" : "text-gray-300"}`}>
                    <span className={sortField === "nombre" && sortDir === "asc" ? "text-brand-secondary" : ""}>▲</span>
                    <span className={sortField === "nombre" && sortDir === "desc" ? "text-brand-secondary" : ""}>▼</span>
                  </span>
                </span>
              </th>
              <th className="px-5 py-3 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("fecha_nacimiento")}>
                <span className="flex items-center gap-1">
                  Cumpleaños
                  <span className={`flex flex-col text-[9px] leading-none ${sortField === "fecha_nacimiento" ? "text-gray-900" : "text-gray-300"}`}>
                    <span className={sortField === "fecha_nacimiento" && sortDir === "asc" ? "text-brand-secondary" : ""}>▲</span>
                    <span className={sortField === "fecha_nacimiento" && sortDir === "desc" ? "text-brand-secondary" : ""}>▼</span>
                  </span>
                </span>
              </th>
              <th className="px-5 py-3 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("fecha_ingreso")}>
                <span className="flex items-center gap-1">
                  Fecha Ingreso
                  <span className={`flex flex-col text-[9px] leading-none ${sortField === "fecha_ingreso" ? "text-gray-900" : "text-gray-300"}`}>
                    <span className={sortField === "fecha_ingreso" && sortDir === "asc" ? "text-brand-secondary" : ""}>▲</span>
                    <span className={sortField === "fecha_ingreso" && sortDir === "desc" ? "text-brand-secondary" : ""}>▼</span>
                  </span>
                </span>
              </th>
              <th className="px-5 py-3">Foto</th>
              <th className="px-5 py-3 text-center">Mostrar Cumple</th>
              <th className="px-5 py-3 text-center">Mostrar Aniv.</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((emp) => (
              <tr
                key={emp.id}
                className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <td className="px-5 py-3 font-mono text-sm text-gray-700">{emp.matricula}</td>
                <td className="px-5 py-3 text-sm">{emp.nombre}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{emp.fecha_nacimiento}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{emp.fecha_ingreso}</td>
                <td className="px-5 py-3">
                  {emp.foto_url ? (
                    <img
                      src={emp.foto_url}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">Sin foto</span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  <Toggle
                    checked={emp.mostrar_cumpleanos}
                    onChange={() => toggleField(emp, "mostrar_cumpleanos")}
                    disabled={updating === `${emp.id}-mostrar_cumpleanos`}
                  />
                </td>
                <td className="px-5 py-3 text-center">
                  <Toggle
                    checked={emp.mostrar_aniversario}
                    onChange={() => toggleField(emp, "mostrar_aniversario")}
                    disabled={updating === `${emp.id}-mostrar_aniversario`}
                  />
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <a
                      href={`/admin/empleados/${emp.id}/editar`}
                      title="Editar"
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-brand-secondary transition-colors"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      title="Eliminar"
                      onClick={() => handleDelete(emp)}
                      disabled={deleting === emp.id}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-brand-danger transition-colors disabled:opacity-50"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  {search ? "Sin resultados" : "No hay empleados registrados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-white">
            <p className="text-gray-400 text-xs">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePage(safePage - 1)}
                disabled={safePage <= 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<number[]>((acc, p) => {
                  if (acc.length > 0 && p - acc[acc.length - 1] > 1) acc.push(-1);
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === -1 ? (
                    <span key={`gap-${i}`} className="px-1 text-gray-300 text-sm">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePage(p)}
                      className={`min-w-[32px] h-8 px-1 rounded-lg text-sm transition-colors ${
                        p === safePage
                          ? "bg-brand-secondary text-white font-semibold"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => handlePage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
