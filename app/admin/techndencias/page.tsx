import { createClient } from "@supabase/supabase-js";
import { TechNdenciasAdmin } from "@/components/admin/TechNdenciasAdmin";
import type { TechNoticia } from "@/lib/domain/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function TechNdenciasAdminPage() {
  const { data } = await supabase
    .from("tech_noticias")
    .select("id, titulo, parrafo, media_url, media_type, orden, activo, created_at")
    .order("orden", { ascending: true });

  return <TechNdenciasAdmin initialNoticias={(data as TechNoticia[]) ?? []} />;
}
