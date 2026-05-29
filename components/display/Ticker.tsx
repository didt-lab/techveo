"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface Props {
  mensajes: string[]; // textos de mensajes activos, ya ordenados
}

export function Ticker({ mensajes }: Props) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      setTime(`${hh}:${mm}:${ss}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const tickerText = mensajes.length > 0
    ? mensajes.join("   ●   ")
    : "";

  return (
    <div className="flex items-stretch h-16 flex-shrink-0" style={{ backgroundColor: "#3bb5a6" }}>
      {/* Logo — fondo blanco para preservar transparencia */}
      <div className="bg-white flex items-center px-6 flex-shrink-0">
        <Image
          src="/techveo-logo.png"
          alt="TechVeo"
          width={140}
          height={46}
          className="object-contain"
          priority
        />
      </div>

      {/* Hora */}
      <div
        className="flex items-center px-6 flex-shrink-0 text-white font-bold text-[27px] tabular-nums"
        style={{
          backgroundColor: "rgba(0,0,0,0.12)",
          borderLeft: "1px solid rgba(255,255,255,0.2)",
          borderRight: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {time}
      </div>

      {/* Texto desfilante */}
      <div className="flex-1 overflow-hidden flex items-center">
        {tickerText && (
          <p
            className="whitespace-nowrap text-white font-medium text-[17px] ticker-scroll"
          >
            {tickerText}
          </p>
        )}
      </div>

      <style jsx>{`
        .ticker-scroll {
          display: inline-block;
          animation: ticker-scroll 30s linear infinite;
          will-change: transform;
        }
        @keyframes ticker-scroll {
          0%   { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
