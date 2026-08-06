"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function completeOnboarding(form: FormData) {
  const supabase=await createClient(); if(!supabase) redirect("/organisateur/onboarding?erreur=configuration");
  const activityIds=form.getAll("activities").map(String); const skills=String(form.get("skills")??"").split(",").map(s=>s.trim()).filter(Boolean);
  const organizerLevel=String(form.get("organizer_level")??"passionne_verifie");
  const allowedLevels=new Set(["passionne_verifie","association","professionnel_diplome","guide_educateur_sportif"]);
  if(!allowedLevels.has(organizerLevel)) redirect("/organisateur/onboarding?erreur=validation");
  const { error }=await supabase.rpc("complete_organizer_onboarding", { p_bio:String(form.get("bio")??""), p_city:String(form.get("city")??""), p_skills:skills, p_activity_ids:activityIds, p_organizer_level:organizerLevel, p_affiliation_name:String(form.get("affiliation_name")||"")||null, p_insurance_provider:String(form.get("insurance_provider")||"")||null, p_insurance_policy_number:String(form.get("insurance_policy_number")||"")||null, p_insurance_expires_at:String(form.get("insurance_expires_at")||"")||null });
  if(error) redirect("/organisateur/onboarding?erreur=validation"); redirect("/organisateur?onboarding=envoye");
}
