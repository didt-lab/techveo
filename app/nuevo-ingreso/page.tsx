"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { NewHireCarousel } from "@/components/display/NewHireCarousel";
import { Clock } from "@/components/display/Clock";
import { EmptyState } from "@/components/display/EmptyState";
import type { NewHiresResponse } from "@/lib/domain/types";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const CACHE_KEY = "techveo:last-newhires";

function loadCache(): NewHiresResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as NewHiresResponse) : null;
  } catch {
    return null;
  }
}

function saveCache(data: NewHiresResponse) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable in some kiosk setups
  }
}

async function fetchNewHires(): Promise<NewHiresResponse> {
  const res = await fetch("/api/nuevo-ingreso", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function NuevoIngresoPage() {
  const { data, isPending } = useQuery<NewHiresResponse>({
    queryKey: ["nuevo-ingreso"],
    queryFn: fetchNewHires,
    refetchInterval: POLL_INTERVAL_MS,
    initialData: loadCache() ?? undefined,
  });

  // Save to cache on successful fetch
  useEffect(() => {
    if (data) saveCache(data);
  }, [data]);

  // Refetch on visibility change (TV waking from sleep)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchNewHires()
          .then(saveCache)
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Daily 3:00 AM reload as memory leak backstop
  useEffect(() => {
    const now = new Date();
    const next3AM = new Date(now);
    next3AM.setHours(3, 0, 0, 0);
    if (next3AM <= now) next3AM.setDate(next3AM.getDate() + 1);
    const ms = next3AM.getTime() - now.getTime();
    const timeout = setTimeout(() => window.location.reload(), ms);
    return () => clearTimeout(timeout);
  }, []);

  const nuevosIngresos = data?.nuevosIngresos ?? [];
  const showEmpty = !isPending && nuevosIngresos.length === 0;

  return (
    <main className="h-screen flex flex-col bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-4 border-b border-gray-300">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">DIDT</h1>
          <p className="text-gray-400 text-sm">
            Dirección de Innovación y Desarrollo Tecnológico
          </p>
        </div>
        <Clock />
      </header>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {nuevosIngresos.length > 0 ? (
          <NewHireCarousel nuevosIngresos={nuevosIngresos} />
        ) : showEmpty ? (
          <EmptyState />
        ) : null}
      </div>

      {/* Footer */}
      <footer className="px-10 py-3 border-t border-gray-300 flex items-center justify-between">
        <span className="text-gray-400 text-xs">
          IMSS · Dirección de Innovación y Desarrollo Tecnológico
        </span>
        {data && (
          <span className="text-gray-400 text-xs">
            Actualizado:{" "}
            {new Date(data.fetchedAt).toLocaleTimeString("es-MX")}
          </span>
        )}
      </footer>
    </main>
  );
}
