"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {requireRole} from "@/lib/auth";
export async function moderateTrip(form:FormData){const user=await requireRole(["administrateur"]);if(!user)redirect("/connexion");const id=String(form.get("trip_id")??"");const decision=String(form.get("decision")??"");if(!id||!["publiee","refusee"].includes(decision))redirect("/administration/sorties?erreur=action");const admin=createAdminClient();const {error}=await admin.from("trips").update({status:decision}).eq("id",id).eq("status","en_attente");if(error)redirect("/administration/sorties?erreur=action");await admin.from("admin_audit_logs").insert({admin_id:user.id,action:"moderate_trip",entity_type:"trip",entity_id:id,details:{decision}});revalidatePath("/administration/sorties");redirect(`/administration/sorties?succes=${decision}`)}
