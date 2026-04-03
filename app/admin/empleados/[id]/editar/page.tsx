import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmployeeForm } from "@/components/admin/EmployeeForm";
import type { Empleado } from "@/lib/domain/types";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: empleado } = await supabase
    .from("empleados")
    .select("*")
    .eq("id", id)
    .single();

  if (!empleado) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Editar empleado</h1>
      <EmployeeForm empleado={empleado as Empleado} />
    </div>
  );
}
