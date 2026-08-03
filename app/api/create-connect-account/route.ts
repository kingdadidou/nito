import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
export async function POST(request:Request){
  try{
    const supabase=await createClient(); if(!supabase) return NextResponse.json({error:"Supabase non configuré"},{status:503});
    const {data:{user}}=await supabase.auth.getUser(); if(!user) return NextResponse.redirect(new URL("/connexion",request.url),303);
    const {data:profile}=await supabase.from("profiles").select("user_type").eq("id",user.id).single();
    if(profile?.user_type!=="organisateur"&&profile?.user_type!=="administrateur") return NextResponse.json({error:"Compte organisateur requis"},{status:403});
    const admin=createAdminClient(); const {data:organizer}=await admin.from("organizer_profiles").select("stripe_connect_account_id").eq("organizer_id",user.id).single();
    const stripe=getStripe(); let accountId=organizer?.stripe_connect_account_id;
    if(!accountId){
      const account=await stripe.accounts.create({type:"express",country:"FR",email:user.email,capabilities:{card_payments:{requested:true},transfers:{requested:true}},business_profile:{product_description:"Organisation de sorties nature via NaturEnsemble"},metadata:{naturensemble_user_id:user.id}},{idempotencyKey:`connect-account:${user.id}`});
      accountId=account.id;
      const {error}=await admin.from("organizer_profiles").upsert({organizer_id:user.id,stripe_connect_account_id:accountId},{onConflict:"organizer_id"}); if(error) throw error;
    }
    const origin=process.env.NEXT_PUBLIC_SITE_URL??new URL(request.url).origin;
    const link=await stripe.accountLinks.create({account:accountId,refresh_url:`${origin}/api/connect/refresh`,return_url:`${origin}/api/connect/return`,type:"account_onboarding"});
    return NextResponse.redirect(link.url,303);
  }catch(error){console.error("Connect onboarding",error);return NextResponse.json({error:"Impossible de démarrer l’inscription Stripe"},{status:500});}
}
