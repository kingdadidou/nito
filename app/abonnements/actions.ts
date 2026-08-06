"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";

export async function toggleOrganizerSubscription(form:FormData){
  const user=await requireRole(["participant"]);
  if(!user)redirect("/connexion");
  const organizerId=String(form.get("organizer_id")??"");
  const operation=String(form.get("operation")??"");
  const tripId=String(form.get("trip_id")??"");
  const returnTo=tripId&&/^[0-9a-f-]{36}$/i.test(tripId)?`/sorties/${tripId}`:"/abonnements";
  if(!/^[0-9a-f-]{36}$/i.test(organizerId)||!["suivre","ne_plus_suivre"].includes(operation))redirect(`${returnTo}?abonnement=erreur`);
  const supabase=await createClient();if(!supabase)redirect(`${returnTo}?abonnement=erreur`);
  const result=operation==="suivre"
    ?await supabase.from("organizer_subscriptions").insert({participant_id:user.id,organizer_id:organizerId})
    :await supabase.from("organizer_subscriptions").delete().eq("participant_id",user.id).eq("organizer_id",organizerId);
  if(result.error&&result.error.code!=="23505")redirect(`${returnTo}?abonnement=erreur`);
  revalidatePath("/abonnements");revalidatePath(returnTo);
  redirect(`${returnTo}?abonnement=${operation==="suivre"?"suivi":"retire"}`);
}
