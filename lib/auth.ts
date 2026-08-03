import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
export async function requireRole(allowed: Role[]) {
  const supabase = await createClient();
  if (!supabase) return null; // mode démonstration sans variables d'environnement
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  const { data } = await supabase.from("profiles").select("user_type").eq("id", user.id).single();
  if (!data || !allowed.includes(data.user_type as Role)) redirect("/");
  return user;
}
