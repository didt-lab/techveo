import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmployeeForm } from "@/components/admin/EmployeeForm";

export default async function NewEmployeePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nuevo empleado</h1>
      <EmployeeForm />
    </div>
  );
}
