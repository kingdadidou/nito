"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";

const qualificationTypes=new Set(["diplome","carte_professionnelle","professionnel"]);
const insuranceTypes=new Set(["assurance_rc_pro","assurance"]);

export async function reviewOrganizerDocument(form:FormData){
  await requireRole(["administrateur"]);
  const documentId=String(form.get("document_id")??"");
  const decision=String(form.get("decision")??"");
  if(!documentId||!["verifie","rejete"].includes(decision))redirect("/administration/documents?erreur=action");

  const session=await createClient();
  if(!session)redirect("/administration/documents?erreur=configuration");
  const reviewer=(await session.auth.getUser()).data.user;
  if(!reviewer)redirect("/connexion");

  const admin=createAdminClient();
  const {data:document,error:documentError}=await admin.from("organizer_documents").select("organizer_id").eq("id",documentId).single();
  if(documentError||!document)redirect("/administration/documents?erreur=document");

  const {error:updateError}=await admin.from("organizer_documents").update({status:decision,reviewed_by:reviewer.id,reviewed_at:new Date().toISOString()}).eq("id",documentId);
  if(updateError)redirect("/administration/documents?erreur=action");

  const {data:documents,error:listError}=await admin.from("organizer_documents").select("document_type,status").eq("organizer_id",document.organizer_id);
  if(listError)redirect("/administration/documents?erreur=indicateurs");
  const verified=documents?.filter(item=>item.status==="verifie")??[];
  const qualificationVerified=verified.some(item=>qualificationTypes.has(item.document_type));
  const insuranceVerified=verified.some(item=>insuranceTypes.has(item.document_type));
  const {error:profileError}=await admin.from("organizer_profiles").update({qualification_verified:qualificationVerified,insurance_verified:insuranceVerified}).eq("organizer_id",document.organizer_id);
  if(profileError)redirect("/administration/documents?erreur=indicateurs");

  revalidatePath("/administration");
  revalidatePath("/administration/documents");
  redirect(`/administration/documents?succes=${decision}`);
}
