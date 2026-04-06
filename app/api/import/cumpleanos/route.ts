import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseBirthdayCsv } from "@/lib/domain/csv-parser";
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

  try {
    const text = await file.text();
    const { valid, errors } = parseBirthdayCsv(text);

    // Get existing records with their fecha_ingreso to preserve it
    const matriculas = valid.map((r) => r.matricula);
    const { data: existingRows, error: selectErr } = await supabase
      .from("empleados")
      .select("matricula, fecha_ingreso")
      .in("matricula", matriculas);

    if (selectErr) {
      return NextResponse.json({ error: selectErr.message }, { status: 500 });
    }

    const existingMap = new Map(
      (existingRows ?? []).map((r: { matricula: string; fecha_ingreso: string }) => [
        r.matricula,
        r.fecha_ingreso,
      ])
    );

    const toInsert = valid
      .filter((r) => !existingMap.has(r.matricula))
      .map((r) => ({
        matricula: r.matricula,
        nombre: r.nombre,
        fecha_nacimiento: r.fecha_nacimiento,
        fecha_ingreso: r.fecha_ingreso ?? "1900-01-01",
      }));

    const toUpsert = valid
      .filter((r) => existingMap.has(r.matricula))
      .map((r) => ({
        matricula: r.matricula,
        nombre: r.nombre,
        fecha_nacimiento: r.fecha_nacimiento,
        fecha_ingreso: r.fecha_ingreso ?? existingMap.get(r.matricula)!,
      }));

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from("empleados")
        .insert(toInsert);
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }

    if (toUpsert.length > 0) {
      const { error: upsertErr } = await supabase
        .from("empleados")
        .upsert(toUpsert, { onConflict: "matricula" });
      if (upsertErr) {
        return NextResponse.json({ error: upsertErr.message }, { status: 500 });
      }
    }

    const result: ImportResult = {
      created: toInsert.length,
      updated: toUpsert.length,
      errors,
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/import/cumpleanos] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
