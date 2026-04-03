"use client";

import { useState } from "react";
import type { Empleado } from "@/lib/domain/types";

export function EmployeeTable({ empleados }: { empleados: Empleado[] }) {
  const [search, setSearch] = useState("");

  const filtered = empleados.filter(
    (e) =>
      e.nombre.toLowerCase().includes(search.toLowerCase()) ||
      e.matricula.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre o matrícula…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white w-80 focus:outline-none focus:border-white/30"
        />
        <a
          href="/admin/empleados/nuevo"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold transition-colors"
        >
          + Nuevo empleado
        </a>
      </div>

      <div className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-sm uppercase tracking-wider">
              <th className="px-6 py-3">Matrícula</th>
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Cumpleaños</th>
              <th className="px-6 py-3">Fecha Ingreso</th>
              <th className="px-6 py-3">Foto</th>
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
                <td colSpan={6} className="px-6 py-8 text-center text-white/30">
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
