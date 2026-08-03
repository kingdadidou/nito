"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function completeOnboarding(form: FormData) {
  const supabase=await createClient(); if(!supabase) redirect("/organisateur/onboarding?erreur=configuration");
  const activityIds=form.getAll("activities").map(String); const skills=String(form.get("skills")??"").split(",").map(s=>s.trim()).filter(Boolean);
  const { error }=await supabase.rpc("complete_organizer_onboarding", { p_bio:String(form.get("bio")??""), p_city:String(form.get("city")??""), p_skills:skills, p_activity_ids:activityIds, p_insurance_provider:String(form.get("insurance_provider")||"")||null, p_insurance_policy_number:String(form.get("insurance_policy_number")||"")||null, p_insurance_expires_at:String(form.get("insurance_expires_at")||"")||null });
  if(error) redirect("/organisateur/onboarding?erreur=validation"); redirect("/organisateur?onboarding=envoye");
}
