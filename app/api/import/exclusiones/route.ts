import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseExclusionCsv } from "@/lib/domain/csv-parser";
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
    const { valid, errors } = parseExclusionCsv(text);

    let updated = 0;
    const notFound: ImportResult["errors"] = [];

    // Group by matricula to handle employees excluded from both
    const byMatricula = new Map<string, Set<"cumpleanos" | "aniversario">>();
    for (const record of valid) {
      if (!byMatricula.has(record.matricula)) {
        byMatricula.set(record.matricula, new Set());
      }
      byMatricula.get(record.matricula)!.add(record.tipo);
    }

    for (const [matricula, tipos] of byMatricula) {
      const updateFields: Record<string, boolean> = {};
      if (tipos.has("cumpleanos")) updateFields.mostrar_cumpleanos = false;
      if (tipos.has("aniversario")) updateFields.mostrar_aniversario = false;

      const { data, error: updateErr } = await supabase
        .from("empleados")
        .update(updateFields)
        .eq("matricula", matricula)
        .select("id");

      if (updateErr) {
        notFound.push({ row: 0, message: `Error actualizando ${matricula}: ${updateErr.message}` });
        continue;
      }

      if (!data || data.length === 0) {
        notFound.push({ row: 0, message: `Matrícula no encontrada: ${matricula}` });
        continue;
      }

      updated++;
    }

    const result: ImportResult = {
      created: 0,
      updated,
      errors: [...errors, ...notFound],
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/import/exclusiones] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
