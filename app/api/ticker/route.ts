import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TickerMensaje, TickerResponse } from "@/lib/domain/types";

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabasePublic
    .from("ticker_mensajes")
    .select("id, texto, orden, activo")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response: TickerResponse = { mensajes: (data as TickerMensaje[]) ?? [] };
  return NextResponse.json(response, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { texto } = await request.json();
  if (!texto?.trim()) {
    return NextResponse.json({ error: "El texto es requerido" }, { status: 400 });
  }

  // Assign orden = max(orden) + 1
  const { data: maxRow } = await supabasePublic
    .from("ticker_mensajes")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .single();

  const orden = maxRow ? (maxRow.orden as number) + 1 : 0;

  const { data, error } = await supabasePublic
    .from("ticker_mensajes")
    .insert({ texto: texto.trim(), orden })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
