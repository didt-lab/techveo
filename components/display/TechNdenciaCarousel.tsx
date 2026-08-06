"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { TechNdenciaSlide } from "./TechNdenciaSlide";
import type { TechNoticia } from "@/lib/domain/types";

const SLIDE_MS = 15000;

export function TechNdenciaCarousel({ noticias }: { noticias: TechNoticia[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % noticias.length);
  }, [noticias.length]);

  useEffect(() => {
    if (noticias.length <= 1) return;
    const interval = setInterval(advance, SLIDE_MS);
    return () => clearInterval(interval);
  }, [advance, noticias.length]);

  useEffect(() => {
    if (currentIndex >= noticias.length) {
      setCurrentIndex(0);
    }
  }, [noticias.length, currentIndex]);

  if (noticias.length === 0) return null;

  const noticia = noticias[currentIndex];

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence mode="wait">
        <TechNdenciaSlide key={`${noticia.id}-${currentIndex}`} noticia={noticia} />
      </AnimatePresence>
    </div>
  );
}
