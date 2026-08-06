"use client";

import { motion } from "framer-motion";
import type { TechNoticia } from "@/lib/domain/types";

export function TechNdenciaSlide({ noticia }: { noticia: TechNoticia }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex"
    >
      {/* Texto — 50% izquierda */}
      <div className="w-1/2 flex flex-col justify-center gap-6 px-16">
        <span className="bg-teal-500 text-white text-lg font-semibold px-5 py-1.5 rounded-full w-fit">
          TechNdencias
        </span>
        <h2 className="text-6xl font-black leading-tight text-gray-900">
          {noticia.titulo}
        </h2>
        <p className="text-3xl font-medium leading-snug text-gray-700 line-clamp-4">
          {noticia.parrafo}
        </p>
      </div>

      {/* Media — 50% derecha */}
      <div className="w-1/2 h-full">
        {noticia.media_type === "video" ? (
          <video
            key={noticia.id}
            src={noticia.media_url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={noticia.media_url}
            alt={noticia.titulo}
            className="w-full h-full object-cover"
          />
        )}
      </div>
    </motion.div>
  );
}
