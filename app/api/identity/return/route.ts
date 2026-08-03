import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const runtime="nodejs";

export async function GET(request:Request){
  const supabase=await createClient();
  if(!supabase)return NextResponse.redirect(new URL("/organisateur/onboarding?identite=erreur",request.url));
  const user=(await supabase.auth.getUser()).data.user;
  if(!user)return NextResponse.redirect(new URL("/connexion",request.url));
  const admin=createAdminClient();const {data:check}=await admin.from("identity_checks").select("provider_check_id").eq("user_id",user.id).eq("provider","stripe_identity").order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(!check?.provider_check_id)return NextResponse.redirect(new URL("/organisateur/onboarding?identite=erreur",request.url));
  try{
    const session=await getStripe().identity.verificationSessions.retrieve(check.provider_check_id);
    const status=session.status==="verified"?"verifie":session.status==="processing"?"en_attente":session.last_error?"rejete":"non_soumis";
    await admin.from("identity_checks").update({status,submitted_at:session.status!=="requires_input"?new Date().toISOString():null,verified_at:session.status==="verified"?new Date().toISOString():null,last_error_code:session.last_error?.code??null}).eq("provider_check_id",session.id);
    if(session.status==="verified")await admin.from("profiles").update({identity_verified:true}).eq("id",user.id);
    const result=session.status==="verified"?"verifiee":session.status==="processing"?"traitement":session.last_error?"a_reprendre":"incomplete";
    return NextResponse.redirect(new URL(`/organisateur/onboarding?identite=${result}`,request.url));
  }catch(error){console.error("Stripe Identity return",error);return NextResponse.redirect(new URL("/organisateur/onboarding?identite=erreur",request.url));}
}
