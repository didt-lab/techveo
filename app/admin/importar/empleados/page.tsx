import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CsvUploader } from "@/components/admin/CsvUploader";

export default async function ImportEmployeesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <div>
      <a
        href="/admin"
        className="inline-flex items-center gap-1 text-white/50 hover:text-white text-sm transition-colors mb-4"
      >
        <span>&larr;</span> Regresar
      </a>
      <CsvUploader
        title="Importar Empleados"
        description="Carga un archivo CSV con los datos completos de empleados. Los registros nuevos se agregan y los existentes (por matrícula) se actualizan."
        expectedColumns="matricula, nombre, fecha_nacimiento, fecha_ingreso"
        apiEndpoint="/api/import/empleados"
      />
    </div>
  );
}
