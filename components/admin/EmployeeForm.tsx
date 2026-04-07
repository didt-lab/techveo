"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Empleado } from "@/lib/domain/types";

interface Props {
  empleado?: Empleado;
}

export function EmployeeForm({ empleado }: Props) {
  const isEditing = Boolean(empleado);
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [matricula, setMatricula] = useState(empleado?.matricula ?? "");
  const [nombre, setNombre] = useState(empleado?.nombre ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(
    empleado?.fecha_nacimiento ?? ""
  );
  const [fechaIngreso, setFechaIngreso] = useState(
    empleado?.fecha_ingreso ?? ""
  );
  const [fotoUrl, setFotoUrl] = useState(empleado?.foto_url ?? "");
  const [mostrarCumpleanos, setMostrarCumpleanos] = useState(
    empleado?.mostrar_cumpleanos ?? true
  );
  const [mostrarAniversario, setMostrarAniversario] = useState(
    empleado?.mostrar_aniversario ?? true
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function uploadPhoto(): Promise<string | null> {
    const file = fileRef.current?.files?.[0];
    if (!file) return fotoUrl || null;

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${matricula}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("fotos-empleados")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(`Error al subir foto: ${uploadError.message}`);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("fotos-empleados").getPublicUrl(path);

    return publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const photoUrl = await uploadPhoto();
    if (error) {
      setLoading(false);
      return;
    }

    const body = {
      matricula,
      nombre,
      fecha_nacimiento: fechaNacimiento,
      fecha_ingreso: fechaIngreso,
      foto_url: photoUrl,
      mostrar_cumpleanos: mostrarCumpleanos,
      mostrar_aniversario: mostrarAniversario,
    };

    const url = isEditing ? `/api/empleados/${empleado!.id}` : "/api/empleados";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  async function handleDelete() {
    if (!empleado || !confirm("¿Eliminar este empleado?")) return;
    setLoading(true);

    const res = await fetch(`/api/empleados/${empleado.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setError("Error al eliminar");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="block text-sm text-white/70 mb-1">Matrícula</label>
        <input
          type="text"
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          required
          className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1">Nombre completo</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1">Fecha de nacimiento</label>
        <input
          type="date"
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
          required
          className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1">Fecha de ingreso</label>
        <input
          type="date"
          value={fechaIngreso}
          onChange={(e) => setFechaIngreso(e.target.value)}
          required
          className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1">Foto</label>
        {fotoUrl && (
          <img
            src={fotoUrl}
            alt="Preview"
            className="w-16 h-16 rounded-full object-cover mb-2"
          />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-700 file:text-white hover:file:bg-gray-600 cursor-pointer"
        />
        <p className="text-white/40 text-xs mt-1">
          O ingresa una URL directa:
        </p>
        <input
          type="url"
          value={fotoUrl}
          onChange={(e) => setFotoUrl(e.target.value)}
          placeholder="https://..."
          className="w-full mt-1 px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30"
        />
      </div>

      <div className="flex gap-8 pt-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <span className="text-sm text-white/70">Mostrar en Cumpleaños</span>
          <button
            type="button"
            role="switch"
            aria-checked={mostrarCumpleanos}
            onClick={() => setMostrarCumpleanos(!mostrarCumpleanos)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              mostrarCumpleanos ? "bg-emerald-600" : "bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                mostrarCumpleanos ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <span className="text-sm text-white/70">Mostrar en Aniversarios</span>
          <button
            type="button"
            role="switch"
            aria-checked={mostrarAniversario}
            onClick={() => setMostrarAniversario(!mostrarAniversario)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              mostrarAniversario ? "bg-emerald-600" : "bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                mostrarAniversario ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl font-semibold transition-colors"
        >
          {loading ? "Guardando…" : isEditing ? "Actualizar" : "Crear empleado"}
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-xl font-semibold transition-colors"
          >
            Eliminar
          </button>
        )}
      </div>
    </form>
  );
}
