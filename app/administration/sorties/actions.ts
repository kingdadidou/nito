"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {requireRole} from "@/lib/auth";
export async function moderateTrip(form:FormData){await requireRole(["administrateur"]);const id=String(form.get("trip_id")??"");const decision=String(form.get("decision")??"");if(!id||!["publiee","refusee"].includes(decision))redirect("/administration/sorties?erreur=action");const {error}=await createAdminClient().from("trips").update({status:decision}).eq("id",id).eq("status","en_attente");if(error)redirect("/administration/sorties?erreur=action");revalidatePath("/administration/sorties");redirect(`/administration/sorties?succes=${decision}`)}

