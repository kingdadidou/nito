"use server";

import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/auth";
import {sendTransactionalEmail} from "@/lib/email/server";

export async function sendDeliverabilityTest(form:FormData){
  const admin=await requireRole(["administrateur"]);
  if(!admin)redirect("/connexion");
  const email=String(form.get("email")??"").trim().toLowerCase();
  const provider=String(form.get("provider")??"").trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!["gmail","outlook","orange","ovh"].includes(provider))redirect("/administration/emails?erreur=champs");
  const result=await sendTransactionalEmail({eventKey:`deliverability:${provider}:${Date.now()}`,to:email,template:"deliverability_test",subject:`Test de délivrabilité NITO — ${provider}`,heading:"Test de réception NITO",content:`Cet e-mail permet de contrôler la réception chez ${provider}. Vérifiez la boîte de réception, les courriers indésirables, l’expéditeur et l’affichage du message.`,actionLabel:"Ouvrir NITO",actionUrl:"https://www.nito-nature.fr"});
  revalidatePath("/administration/emails");
  redirect(`/administration/emails?${result.sent?"succes=envoye":"erreur=envoi"}`);
}
