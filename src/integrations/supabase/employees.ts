import { supabase } from "./client";
import type { Database } from "./types";

export type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
type EmployeeInsert = Database["public"]["Tables"]["employees"]["Insert"];
type EmployeeUpdate = Database["public"]["Tables"]["employees"]["Update"];

export async function listEmployees(): Promise<EmployeeRow[]> {
  const { data, error } = await supabase.from("employees").select("*");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createEmployee(employee: EmployeeInsert): Promise<EmployeeRow> {
  const { data, error } = await supabase.from("employees").insert(employee).select().single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao criar colaborador no Supabase");
  }

  return data;
}

export async function updateEmployee(id: string, employee: EmployeeUpdate): Promise<EmployeeRow> {
  const { data, error } = await supabase.from("employees").update(employee).eq("id", id).select().single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao atualizar colaborador no Supabase");
  }

  return data;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from("employees").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
