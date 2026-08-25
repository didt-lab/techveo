"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TechNdenciaCarousel } from "@/components/display/TechNdenciaCarousel";
import { EmptyState } from "@/components/display/EmptyState";
import type { TechNoticiasResponse } from "@/lib/domain/types";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const CACHE_KEY = "techveo:last-techndencias";

function loadCache(): TechNoticiasResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as TechNoticiasResponse) : null;
  } catch {
    return null;
  }
}

function saveCache(data: TechNoticiasResponse) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable in some kiosk setups
  }
}

async function fetchTechNoticias(): Promise<TechNoticiasResponse> {
  const res = await fetch("/api/techndencias", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function TechNdenciasPage() {
  const { data, isPending, refetch: refetchTechNoticias } = useQuery<TechNoticiasResponse>({
    queryKey: ["techndencias"],
    queryFn: fetchTechNoticias,
    refetchInterval: POLL_INTERVAL_MS,
    initialData: loadCache() ?? undefined,
  });

  useEffect(() => {
    if (data) saveCache(data);
  }, [data]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refetchTechNoticias();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [refetchTechNoticias]);

  useEffect(() => {
    const now = new Date();
    const next3AM = new Date(now);
    next3AM.setHours(3, 0, 0, 0);
    if (next3AM <= now) next3AM.setDate(next3AM.getDate() + 1);
    const ms = next3AM.getTime() - now.getTime();
    const timeout = setTimeout(() => window.location.reload(), ms);
    return () => clearTimeout(timeout);
  }, []);

  const noticias = data?.noticias ?? [];
  const showEmpty = !isPending && noticias.length === 0;

  return (
    <main className="h-screen flex flex-col bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="flex-1 relative overflow-hidden">
        {noticias.length > 0 ? (
          <TechNdenciaCarousel noticias={noticias} />
        ) : showEmpty ? (
          <EmptyState />
        ) : null}
      </div>
    </main>
  );
}
