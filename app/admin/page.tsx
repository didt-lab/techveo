import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmployeeTable } from "@/components/admin/EmployeeTable";
import { redirect } from "next/navigation";
import type { Empleado } from "@/lib/domain/types";

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: empleados } = await supabase
    .from("empleados")
    .select("*")
    .order("nombre");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Empleados</h1>
      <EmployeeTable empleados={(empleados as Empleado[]) ?? []} />
    </div>
  );
}
