import { createClient } from "@supabase/supabase-js";
import { TickerAdmin } from "@/components/admin/TickerAdmin";
import type { TickerMensaje } from "@/lib/domain/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function TickerPage() {
  const { data } = await supabase
    .from("ticker_mensajes")
    .select("id, texto, orden, activo")
    .order("orden", { ascending: true });

  return <TickerAdmin initialMensajes={(data as TickerMensaje[]) ?? []} />;
}
