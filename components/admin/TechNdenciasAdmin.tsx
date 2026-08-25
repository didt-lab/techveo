"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TechNoticia } from "@/lib/domain/types";

interface Props {
  initialNoticias: TechNoticia[];
}

const TITULO_MAX = 80;
const PARRAFO_MAX = 180;

async function compressImage(file: File, maxPx = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function TechNdenciasAdmin({ initialNoticias }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [noticias, setNoticias] = useState<TechNoticia[]>(initialNoticias);
  const [titulo, setTitulo] = useState("");
  const [parrafo, setParrafo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function uploadMedia(): Promise<
    { url: string; type: "imagen" | "video"; id: string; path: string } | null
  > {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona una imagen o video");
      return null;
    }

    const id = crypto.randomUUID();
    const isVideo = file.type.startsWith("video/");

    if (isVideo) {
      if (file.type !== "video/mp4" && file.type !== "video/webm") {
        setError("El video debe ser MP4 o WebM");
        return null;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError("El video no debe superar 20MB");
        return null;
      }
      const ext = file.type === "video/webm" ? "webm" : "mp4";
      const path = `${id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("techndencias-media")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        setError(`Error al subir video: ${uploadError.message}`);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("techndencias-media").getPublicUrl(path);

      return { url: publicUrl, type: "video", id, path };
    }

    const compressed = await compressImage(file);
    const path = `${id}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("techndencias-media")
      .upload(path, compressed, { contentType: "image/jpeg" });

    if (uploadError) {
      setError(`Error al subir imagen: ${uploadError.message}`);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("techndencias-media").getPublicUrl(path);

    return { url: publicUrl, type: "imagen", id, path };
  }

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!titulo.trim() || !parrafo.trim()) {
      setError("Título y párrafo son requeridos");
      return;
    }

    setUploading(true);
    try {
      const media = await uploadMedia();
      if (!media) {
        setUploading(false);
        return;
      }

      const res = await fetch("/api/techndencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: media.id,
          titulo: titulo.trim(),
          parrafo: parrafo.trim(),
          media_url: media.url,
          media_type: media.type,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al guardar");
        await supabase.storage
          .from("techndencias-media")
          .remove([media.path])
          .catch(() => {});
        setUploading(false);
        return;
      }

      const nueva = (await res.json()) as TechNoticia;
      setNoticias((prev) => [...prev, nueva]);
      setTitulo("");
      setParrafo("");
      if (fileRef.current) fileRef.current.value = "";
      setUploading(false);
      setSuccess("Noticia agregada");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Error inesperado al subir el archivo");
      setUploading(false);
      return;
    }
  }

  async function handleToggle(id: string) {
    const noticia = noticias.find((n) => n.id === id);
    if (!noticia) return;
    const res = await fetch(`/api/techndencias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !noticia.activo }),
    });
    if (!res.ok) return;
    setNoticias((prev) =>
      prev.map((n) => (n.id === id ? { ...n, activo: !n.activo } : n))
    );
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar esta noticia?")) return;
    const res = await fetch(`/api/techndencias/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setNoticias((prev) => prev.filter((n) => n.id !== id));
  }

  function moverArriba(index: number) {
    if (index === 0) return;
    setNoticias((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moverAbajo(index: number) {
    if (index === noticias.length - 1) return;
    setNoticias((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  async function handleGuardarOrden() {
    setSaving(true);
    setError("");
    setSuccess("");
    const updates = noticias.map((n, i) =>
      fetch(`/api/techndencias/${n.id}`, {
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
      setSuccess("Orden guardado");
      setTimeout(() => setSuccess(""), 3000);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">TechNdencias</h1>

      <div className="flex flex-col gap-3 mb-8">
        {noticias.length === 0 && (
          <p className="text-gray-400 text-sm">No hay noticias. Agrega una abajo.</p>
        )}
        {noticias.map((noticia, i) => (
          <div
            key={noticia.id}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
          >
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
                disabled={i === noticias.length - 1}
                className="text-gray-400 hover:text-gray-900 disabled:opacity-20 leading-none text-xs"
              >
                ▼
              </button>
            </div>

            {noticia.media_type === "video" ? (
              <video
                src={noticia.media_url}
                muted
                preload="metadata"
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-200"
              />
            ) : (
              <img
                src={noticia.media_url}
                alt={noticia.titulo}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            )}

            <span className="flex-1 text-sm text-gray-700 truncate">{noticia.titulo}</span>

            <button
              onClick={() => handleToggle(noticia.id)}
              title={noticia.activo ? "Desactivar" : "Activar"}
              className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${
                noticia.activo ? "bg-brand-primary" : "bg-gray-300"
              }`}
            />

            <button
              onClick={() => handleEliminar(noticia.id)}
              className="text-red-400 hover:text-red-600 text-xs font-bold ml-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {noticias.length > 0 && (
        <button
          onClick={handleGuardarOrden}
          disabled={saving}
          className="w-full py-3 rounded-xl font-semibold transition-colors mb-8 text-white bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar orden"}
        </button>
      )}

      <form
        onSubmit={handleAgregar}
        className="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-gray-800">Agregar noticia</h2>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Título ({titulo.length}/{TITULO_MAX})
          </label>
          <input
            type="text"
            value={titulo}
            maxLength={TITULO_MAX}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full px-4 py-3 bg-[#F5F6F7] border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-brand-secondary"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Párrafo ({parrafo.length}/{PARRAFO_MAX})
          </label>
          <textarea
            value={parrafo}
            maxLength={PARRAFO_MAX}
            onChange={(e) => setParrafo(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-[#F5F6F7] border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-brand-secondary resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Imagen o video</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-primary file:text-white hover:file:bg-brand-primaryHover cursor-pointer"
          />
          <p className="text-gray-400 text-xs mt-1">Video máx. 20MB, formato MP4 o WebM.</p>
        </div>

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-brand-primary text-sm font-semibold">{success}</p>
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={uploading}
          className="px-6 py-3 bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
        >
          {uploading ? "Subiendo…" : "Agregar noticia"}
        </button>
      </form>

      <div className="mt-10">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">
          Vista previa (split 50/50)
        </p>
        <div
          className="flex rounded-xl overflow-hidden border border-gray-200"
          style={{ aspectRatio: "16/9" }}
        >
          <div className="w-1/2 flex flex-col justify-center gap-3 px-8 bg-gradient-to-br from-gray-100 to-gray-200">
            <span className="bg-teal-500 text-white text-xs font-semibold px-3 py-1 rounded-full w-fit">
              TechNdencias
            </span>
            <h3 className="text-2xl font-black leading-tight text-gray-900">
              {titulo || "Título de la noticia"}
            </h3>
            <p className="text-base font-medium leading-snug text-gray-700 line-clamp-4">
              {parrafo || "El párrafo aparece aquí, máximo 4 líneas en pantalla."}
            </p>
          </div>
          <div className="w-1/2 bg-gray-300 flex items-center justify-center text-gray-500 text-xs">
            imagen / video
          </div>
        </div>
      </div>
    </div>
  );
}
