"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

export async function updateProfile(form:FormData){
  const supabase=await createClient();
  if(!supabase)redirect("/profil?profil=configuration");
  const user=(await supabase.auth.getUser()).data.user;
  if(!user)redirect("/connexion");
  const firstName=String(form.get("first_name")??"").trim();
  const lastName=String(form.get("last_name")??"").trim();
  const city=String(form.get("city")??"").trim();
  const bio=String(form.get("bio")??"").trim();
  if(firstName.length<2||lastName.length<2||city.length>120||bio.length>2000)redirect("/profil?profil=invalide");
  const {error}=await supabase.from("profiles").update({first_name:firstName,last_name:lastName,city:city||null,bio:bio||null}).eq("id",user.id);
  if(error)redirect("/profil?profil=erreur");
  revalidatePath("/profil");revalidatePath("/");
  redirect("/profil?profil=ok");
}

