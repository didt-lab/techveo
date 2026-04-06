import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAnniversaryCsv } from "@/lib/domain/csv-parser";
import type { ImportResult } from "@/lib/domain/types";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
  }

  const text = await file.text();
  const { valid, errors } = parseAnniversaryCsv(text);

  const matriculas = valid.map((r) => r.matricula);
  const { data: existingRows } = await supabase
    .from("empleados")
    .select("matricula")
    .in("matricula", matriculas);

  const existingSet = new Set(
    (existingRows ?? []).map((r: { matricula: string }) => r.matricula)
  );

  const toInsert = valid
    .filter((r) => !existingSet.has(r.matricula))
    .map((r) => ({
      matricula: r.matricula,
      nombre: r.nombre,
      fecha_nacimiento: "1900-01-01",
      fecha_ingreso: r.fecha_ingreso,
    }));

  const toUpdate = valid.filter((r) => existingSet.has(r.matricula));

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from("empleados")
      .insert(toInsert);
    if (insertErr) throw insertErr;
  }

  if (toUpdate.length > 0) {
    const { error: upsertErr } = await supabase
      .from("empleados")
      .upsert(
        toUpdate.map((r) => ({
          matricula: r.matricula,
          nombre: r.nombre,
          fecha_ingreso: r.fecha_ingreso,
        })),
        { onConflict: "matricula", ignoreDuplicates: false }
      );
    if (upsertErr) throw upsertErr;
  }

  const result: ImportResult = {
    created: toInsert.length,
    updated: toUpdate.length,
    errors,
  };
  return NextResponse.json(result);
}
