"use client";

import { useState } from "react";
import type { TickerMensaje } from "@/lib/domain/types";

interface Props {
  initialMensajes: TickerMensaje[];
}

export function TickerAdmin({ initialMensajes }: Props) {
  const [mensajes, setMensajes] = useState<TickerMensaje[]>(initialMensajes);
  const [nuevoTexto, setNuevoTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleAgregar() {
    if (!nuevoTexto.trim()) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/ticker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: nuevoTexto.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al agregar");
      setSaving(false);
      return;
    }
    const nuevo = await res.json() as TickerMensaje;
    setMensajes((prev) => [...prev, nuevo]);
    setNuevoTexto("");
    setSaving(false);
  }

  async function handleToggle(id: string) {
    const msg = mensajes.find((m) => m.id === id);
    if (!msg) return;
    const res = await fetch(`/api/ticker/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !msg.activo }),
    });
    if (!res.ok) return;
    setMensajes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, activo: !m.activo } : m))
    );
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar este mensaje?")) return;
    const res = await fetch(`/api/ticker/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setMensajes((prev) => prev.filter((m) => m.id !== id));
  }

  function moverArriba(index: number) {
    if (index === 0) return;
    setMensajes((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moverAbajo(index: number) {
    if (index === mensajes.length - 1) return;
    setMensajes((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  async function handleGuardar() {
    setSaving(true);
    setError("");
    setSuccess("");
    const updates = mensajes.map((m, i) =>
      fetch(`/api/ticker/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden: i }),
      })
    );
    const results = await Promise.all(updates);
    const failed = results.some((r) => !r.ok);
    setSaving(false);
    if (failed) {
      setError("Error al guardar el orden");
    } else {
      setSuccess("Cambios guardados");
      setTimeout(() => setSuccess(""), 3000);
    }
  }

  const activosMensajes = mensajes.filter((m) => m.activo).map((m) => m.texto);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Ticker</h1>

      {/* Lista de mensajes */}
      <div className="flex flex-col gap-3 mb-6">
        {mensajes.length === 0 && (
          <p className="text-gray-400 text-sm">No hay mensajes. Agrega uno abajo.</p>
        )}
        {mensajes.map((msg, i) => (
          <div
            key={msg.id}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
          >
            {/* Botones de orden */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => moverArriba(i)}
                disabled={i === 0}
                className="text-gray-400 hover:text-gray-900 disabled:opacity-20 leading-none text-xs"
              >
                ▲
              </button>
              <button
                onClick={() => moverAbajo(i)}
                disabled={i === mensajes.length - 1}
                className="text-gray-400 hover:text-gray-900 disabled:opacity-20 leading-none text-xs"
              >
                ▼
              </button>
            </div>

            {/* Texto */}
            <span className="flex-1 text-sm text-gray-700">{msg.texto}</span>

            {/* Toggle activo */}
            <button
              onClick={() => handleToggle(msg.id)}
              title={msg.activo ? "Desactivar" : "Activar"}
              className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${
                msg.activo ? "bg-emerald-500" : "bg-gray-300"
              }`}
            />

            {/* Eliminar */}
            <button
              onClick={() => handleEliminar(msg.id)}
              className="text-red-400 hover:text-red-600 text-xs font-bold ml-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Agregar nuevo */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={nuevoTexto}
          onChange={(e) => setNuevoTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAgregar()}
          placeholder="Escribe un nuevo mensaje…"
          className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-gray-400"
        />
        <button
          onClick={handleAgregar}
          disabled={saving || !nuevoTexto.trim()}
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          + Agregar
        </button>
      </div>

      {/* Guardar orden */}
      <button
        onClick={handleGuardar}
        disabled={saving}
        className="w-full py-3 rounded-xl font-semibold transition-colors mb-6 text-white disabled:opacity-50"
        style={{ backgroundColor: "#3bb5a6" }}
      >
        {saving ? "Guardando…" : "Guardar orden"}
      </button>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {success && <p className="text-emerald-600 text-sm mb-4">{success}</p>}

      {/* Vista previa */}
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Vista previa</p>
        <div
          className="flex items-stretch rounded-xl overflow-hidden"
          style={{ height: "44px", backgroundColor: "#3bb5a6" }}
        >
          <div className="bg-white flex items-center px-4 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/techveo-logo.png" alt="TechVeo" className="h-7 object-contain" />
          </div>
          <div
            className="flex items-center px-4 flex-shrink-0 text-white font-bold text-sm tabular-nums"
            style={{
              backgroundColor: "rgba(0,0,0,0.12)",
              borderLeft: "1px solid rgba(255,255,255,0.2)",
              borderRight: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            {new Date().toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </div>
          <div className="flex-1 overflow-hidden flex items-center">
            {activosMensajes.length > 0 ? (
              <p
                className="whitespace-nowrap text-white text-xs font-medium ticker-preview-scroll"
                style={{ paddingLeft: "100%" }}
              >
                {activosMensajes.join("   ●   ")}
              </p>
            ) : (
              <span className="text-white/40 text-xs px-4">Sin mensajes activos</span>
            )}
          </div>
        </div>
        <style jsx>{`
          .ticker-preview-scroll {
            animation: ticker-preview 20s linear infinite;
          }
          @keyframes ticker-preview {
            from { transform: translateX(0); }
            to   { transform: translateX(-200%); }
          }
        `}</style>
      </div>
    </div>
  );
}
