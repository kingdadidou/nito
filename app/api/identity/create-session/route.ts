import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const supabase=await createClient();
    if(!supabase)return NextResponse.redirect(new URL("/organisateur/onboarding?identite=erreur",request.url),303);
    const user=(await supabase.auth.getUser()).data.user;
    if(!user)return NextResponse.redirect(new URL("/connexion",request.url),303);
    const {data:profile}=await supabase.from("profiles").select("user_type,identity_verified").eq("id",user.id).single();
    if(!profile||!(["organisateur","administrateur"] as string[]).includes(profile.user_type))return NextResponse.json({error:"Accès réservé aux organisateurs"},{status:403});
    if(profile.identity_verified)return NextResponse.redirect(new URL("/organisateur/onboarding?identite=verifiee",request.url),303);
    const origin=process.env.NEXT_PUBLIC_SITE_URL??new URL(request.url).origin;
    const session=await getStripe().identity.verificationSessions.create({type:"document",client_reference_id:user.id,provided_details:user.email?{email:user.email}:undefined,options:{document:{allowed_types:["driving_license","id_card","passport"],require_live_capture:true,require_matching_selfie:true}},return_url:`${origin}/api/identity/return`,metadata:{naturensemble_user_id:user.id}});
    const {error}=await createAdminClient().from("identity_checks").insert({user_id:user.id,provider:"stripe_identity",provider_check_id:session.id,status:"non_soumis"});
    if(error)throw error;
    if(!session.url)throw new Error("URL Stripe Identity absente");
    return NextResponse.redirect(session.url,303);
  }catch(error){console.error("Stripe Identity session",error);return NextResponse.redirect(new URL("/organisateur/onboarding?identite=erreur",request.url),303);}
}
