"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
export async function resolveReport(form:FormData){const user=await requireRole(["administrateur"]);if(!user)redirect("/connexion");const id=String(form.get("report_id")??"");const status=String(form.get("status")??"");if(!/^[0-9a-f-]{36}$/i.test(id)||!["en_cours","resolu","rejete"].includes(status))redirect("/administration/signalements?erreur=action");const admin=createAdminClient();const {error}=await admin.from("reports").update({status,handled_by:user.id,resolved_at:["resolu","rejete"].includes(status)?new Date().toISOString():null}).eq("id",id);if(error)redirect("/administration/signalements?erreur=action");await admin.from("admin_audit_logs").insert({admin_id:user.id,action:"update_report",entity_type:"report",entity_id:id,details:{status}});revalidatePath("/administration/signalements");redirect("/administration/signalements?succes=1")}
