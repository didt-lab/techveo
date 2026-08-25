"use client";

import { useState, useRef } from "react";
import type { ImportResult } from "@/lib/domain/types";

interface Props {
  title: string;
  description: string;
  expectedColumns: string;
  apiEndpoint: string;
}

export function CsvUploader({
  title,
  description,
  expectedColumns,
  apiEndpoint,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(apiEndpoint, { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Error desconocido");
        setStatus("error");
        return;
      }

      setResult(data as ImportResult);
      setStatus("ok");
    } catch {
      setErrorMsg("No se pudo conectar con el servidor");
      setStatus("error");
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-gray-500 text-sm mb-6">{description}</p>

      <div className="bg-gray-100 rounded-lg p-4 mb-6 text-xs font-mono text-gray-600">
        <p className="text-gray-400 mb-1">Columnas esperadas en el CSV:</p>
        <p>{expectedColumns}</p>
        <p className="text-gray-400 mt-1">Formato de fecha: YYYY-MM-DD</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-primary file:text-white hover:file:bg-brand-primaryHover cursor-pointer mb-4"
      />

      <button
        onClick={handleUpload}
        disabled={status === "loading"}
        className="w-full py-3 bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50 rounded-xl font-semibold text-white transition-colors"
      >
        {status === "loading" ? "Importando…" : "Importar CSV"}
      </button>

      {status === "ok" && result && (
        <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-brand-primary font-semibold">Importación completada</p>
          <p className="text-gray-600 text-sm mt-1">
            Creados: {result.created} · Actualizados: {result.updated}
          </p>
          {result.errors.length > 0 && (
            <details className="mt-3">
              <summary className="text-yellow-600 text-sm cursor-pointer">
                {result.errors.length} errores
              </summary>
              <ul className="mt-2 text-xs text-gray-500 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Fila {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {status === "error" && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-semibold">Error</p>
          <p className="text-gray-600 text-sm mt-1">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
