"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
export async function moderateReview(form:FormData){const adminUser=await requireRole(["administrateur"]);if(!adminUser)redirect("/connexion");const id=String(form.get("review_id")??"");const status=String(form.get("status")??"");if(!/^[0-9a-f-]{36}$/i.test(id)||!["publie","masque"].includes(status))redirect("/administration/avis?erreur=action");const admin=createAdminClient();const {data:review,error}=await admin.from("reviews").update({moderation_status:status,moderated_at:new Date().toISOString(),moderated_by:adminUser.id}).eq("id",id).select("recipient_id").single();if(error)redirect("/administration/avis?erreur=action");await admin.from("admin_audit_logs").insert({admin_id:adminUser.id,action:status==="masque"?"hide_review":"publish_review",entity_type:"review",entity_id:id,details:{recipient_id:review.recipient_id}});revalidatePath("/administration/avis");revalidatePath(`/organisateurs/${review.recipient_id}`);redirect("/administration/avis?succes=1")}
