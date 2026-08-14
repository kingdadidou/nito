import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getStripe} from "@/lib/stripe/server";
export async function POST(request:Request){const supabase=await createClient();const user=supabase?(await supabase.auth.getUser()).data.user:null;if(!user)return NextResponse.redirect(new URL("/connexion",request.url),303);const {data}=await createAdminClient().from("organizer_profiles").select("stripe_connect_account_id").eq("organizer_id",user.id).maybeSingle();if(!data?.stripe_connect_account_id)return NextResponse.redirect(new URL("/organisateur/onboarding?stripe=erreur",request.url),303);try{const login=await getStripe().accounts.createLoginLink(data.stripe_connect_account_id);return NextResponse.redirect(login.url,303)}catch{return NextResponse.redirect(new URL("/organisateur/onboarding?stripe=erreur",request.url),303)}}
