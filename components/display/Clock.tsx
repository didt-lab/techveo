"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  return (
    <div className="text-right">
      <p className="text-4xl font-bold text-white tabular-nums">
        {format(now, "HH:mm")}
      </p>
      <p className="text-white/60 text-sm mt-0.5 capitalize">
        {format(now, "EEEE d 'de' MMMM yyyy", { locale: es })}
      </p>
    </div>
  );
}
