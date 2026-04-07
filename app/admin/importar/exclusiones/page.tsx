import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CsvUploader } from "@/components/admin/CsvUploader";

export default async function ImportExclusionsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <CsvUploader
      title="Importar Exclusiones"
      description="Carga un archivo CSV con los empleados que no desean aparecer en las pantallas de cumpleaños o aniversarios"
      expectedColumns="matricula, nombre, tema (Cumpleaños / Antigüedad), mes"
      apiEndpoint="/api/import/exclusiones"
    />
  );
}
