"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {validModeration} from "@/lib/domain/rules";
export async function moderateUser(form:FormData){const adminUser=await requireRole(["administrateur"]);if(!adminUser)redirect("/connexion");const userId=String(form.get("user_id")??"");const decision=String(form.get("decision")??"");const reason=String(form.get("reason")??"").trim();if(!validModeration({actorId:adminUser.id,targetId:userId,decision,reason}))redirect(`/administration/utilisateurs?erreur=${decision==="suspendu"&&reason.length<5?"motif":"action"}`);const admin=createAdminClient();const {error}=await admin.from("profiles").update({account_status:decision,suspension_reason:decision==="suspendu"?reason:null,suspended_at:decision==="suspendu"?new Date().toISOString():null,suspended_by:decision==="suspendu"?adminUser.id:null}).eq("id",userId);if(error)redirect("/administration/utilisateurs?erreur=action");await admin.from("admin_audit_logs").insert({admin_id:adminUser.id,action:decision==="suspendu"?"suspend_user":"reactivate_user",entity_type:"profile",entity_id:userId,details:{reason}});revalidatePath("/administration/utilisateurs");redirect(`/administration/utilisateurs?succes=${decision}`)}
