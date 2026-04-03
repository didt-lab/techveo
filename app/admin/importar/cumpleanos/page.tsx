import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CsvUploader } from "@/components/admin/CsvUploader";

export default async function ImportBirthdaysPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <CsvUploader
      title="Importar Cumpleaños"
      description="Carga un archivo CSV con las fechas de cumpleaños de los empleados"
      expectedColumns="matricula, nombre, fecha_nacimiento"
      apiEndpoint="/api/import/cumpleanos"
    />
  );
}
