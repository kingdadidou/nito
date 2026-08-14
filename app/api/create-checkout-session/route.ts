import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { eurosToCents,getStripe } from "@/lib/stripe/server";
import {getBookingEmailContext,sendTransactionalEmail} from "@/lib/email/server";
export async function POST(request:Request){
  let tripId="";let stage="initialisation";
  try{
    const form=await request.formData();tripId=String(form.get("tripId")??"");const quantity=Number(form.get("quantity")??1);
    if(form.get("booking_terms")!=="accepted")return NextResponse.json({error:"Les conditions de réservation doivent être acceptées"},{status:400});
    if(!/^[0-9a-f-]{36}$/i.test(tripId)||!Number.isInteger(quantity))return NextResponse.json({error:"Réservation invalide"},{status:400});
    const supabase=await createClient();if(!supabase)return NextResponse.json({error:"Supabase non configuré"},{status:503});
    const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.redirect(new URL("/connexion",request.url),303);
    const admin=createAdminClient();
    const {data:trip}=await admin.from("trips").select("organizer_id,price").eq("id",tripId).single();
    if(!trip)return NextResponse.redirect(new URL(`/sorties/${tripId}?paiement=indisponible`,request.url),303);
    let organizer:null|{stripe_connect_account_id:string|null;stripe_charges_enabled:boolean;stripe_payouts_enabled:boolean}=null;
    if(Number(trip.price)>0){
      const result=await admin.from("organizer_profiles").select("stripe_connect_account_id,stripe_charges_enabled,stripe_payouts_enabled").eq("organizer_id",trip.organizer_id).single();
      organizer=result.data;
      if(!organizer?.stripe_connect_account_id)return NextResponse.redirect(new URL(`/sorties/${tripId}?paiement=organisateur_incomplet`,request.url),303);
      stage="verification_compte";const account=await getStripe().accounts.retrieve(organizer.stripe_connect_account_id);
      await admin.from("organizer_profiles").update({stripe_charges_enabled:account.charges_enabled,stripe_payouts_enabled:account.payouts_enabled}).eq("organizer_id",trip.organizer_id);
      if(!account.charges_enabled||!account.payouts_enabled)return NextResponse.redirect(new URL(`/sorties/${tripId}?paiement=organisateur_incomplet`,request.url),303);
    }
    stage="preparation_reservation";const {data,error}=await supabase.rpc("prepare_booking",{p_trip_id:tripId,p_number_of_people:quantity});
    if(error||!data?.[0])return NextResponse.json({error:error?.message??"Réservation impossible"},{status:409});
    const prepared=data[0];
    if(Number(prepared.amount)===0){await admin.from("bookings").update({payment_status:"paye",booking_status:"confirmee"}).eq("id",prepared.booking_id);const context=await getBookingEmailContext(prepared.booking_id);if(context?.participant?.email&&context.trip)await sendTransactionalEmail({eventKey:`booking-confirmed:${prepared.booking_id}`,to:context.participant.email,userId:context.participant_id,template:"booking_confirmed",subject:`Réservation confirmée : ${context.trip.title}`,heading:"Votre réservation est confirmée",content:`Votre réservation de ${context.number_of_people} place(s) pour ${context.trip.title} est confirmée. Cette sortie est gratuite.`,actionLabel:"Voir mon calendrier",actionUrl:`${process.env.NEXT_PUBLIC_SITE_URL}/calendrier`});if(context?.organizer?.email&&context.trip)await sendTransactionalEmail({eventKey:`organizer-new-booking:${prepared.booking_id}`,to:context.organizer.email,userId:context.trip.organizer_id,template:"organizer_new_booking",subject:`Nouvelle réservation : ${context.trip.title}`,heading:"Vous avez une nouvelle réservation",content:`${context.participant?.first_name||"Un participant"} a réservé ${context.number_of_people} place(s) pour ${context.trip.title}.`,actionLabel:"Ouvrir mon tableau de bord",actionUrl:`${process.env.NEXT_PUBLIC_SITE_URL}/organisateur`});return NextResponse.redirect(new URL("/calendrier?reservation=confirmee",request.url),303);}
    if(!organizer?.stripe_connect_account_id)return NextResponse.redirect(new URL(`/sorties/${tripId}?paiement=organisateur_incomplet`,request.url),303);
    const stripe=getStripe();
    const origin=process.env.NEXT_PUBLIC_SITE_URL??new URL(request.url).origin;
    const {data:previousBooking}=await admin.from("bookings").select("stripe_checkout_session_id").eq("id",prepared.booking_id).single();
    if(previousBooking?.stripe_checkout_session_id){try{const previousSession=await stripe.checkout.sessions.retrieve(previousBooking.stripe_checkout_session_id);if(previousSession.status==="open")await stripe.checkout.sessions.expire(previousSession.id);}catch(expirationError){console.warn("Expiration ancienne session Stripe",expirationError);}}
    const totalCents=eurosToCents(Number(prepared.amount));
    const platformFeeCents=eurosToCents(Number(prepared.platform_fee));
    const organizerAmountCents=totalCents-platformFeeCents;
    if(organizerAmountCents<1)throw new Error("Le montant destiné à l'organisateur est invalide");
    stage="creation_checkout";const session=await stripe.checkout.sessions.create({mode:"payment",managed_payments:{enabled:false},customer_email:user.email,line_items:[{quantity:1,price_data:{currency:"eur",unit_amount:totalCents,product_data:{name:prepared.trip_title,description:`${quantity} participant${quantity>1?"s":""}`}}}],client_reference_id:prepared.booking_id,metadata:{booking_id:prepared.booking_id,trip_id:tripId,participant_id:user.id,fee_collection:"transfer_amount"},payment_intent_data:{transfer_data:{destination:organizer.stripe_connect_account_id,amount:organizerAmountCents},metadata:{booking_id:prepared.booking_id,trip_id:tripId,platform_fee_cents:String(platformFeeCents),fee_collection:"transfer_amount"}},success_url:`${origin}/calendrier?reservation=confirmee&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/sorties/${tripId}?paiement=annule`},{idempotencyKey:`checkout:v4:${prepared.booking_id}`});
    const {error:updateError}=await admin.from("bookings").update({stripe_checkout_session_id:session.id}).eq("id",prepared.booking_id);if(updateError)throw updateError;
    return NextResponse.redirect(session.url!,303);
  }catch(error){console.error("Checkout Connect",error);const value=error&&typeof error==="object"?error:null;const originalMessage=value&&"message" in value?String(value.message):"";const message=originalMessage.toLowerCase();const reason=message.includes("destination")?"destination":message.includes("application_fee")||message.includes("application fee")?"commission":message.includes("capabilit")?"capacite":message.includes("live mode")||message.includes("test mode")?"mode":message.includes("currency")?"devise":"requete_invalide";const rawCode=value&&"code" in value&&value.code?String(value.code):value&&"type" in value&&value.type?String(value.type):value&&"name" in value?String(value.name):"inconnue";const rawParam=value&&"param" in value&&value.param?String(value.param):"sans_parametre";const safeParam=rawParam.replace(/[^a-zA-Z0-9_.[\]-]/g,"_").slice(0,100);const safeDetail=originalMessage.replace(/sk_(?:live|test)_[a-zA-Z0-9]+/g,"[clé masquée]").replace(/acct_[a-zA-Z0-9]+/g,"[compte connecté]").replace(/https?:\/\/\S+/g,"[lien masqué]").slice(0,240);const code=`${stage}:${reason}:${rawCode}:${safeParam}${safeDetail?`:${safeDetail}`:""}`;const target=/^[0-9a-f-]{36}$/i.test(tripId)?`/sorties/${tripId}?paiement=erreur&code=${encodeURIComponent(code)}`:"/explorer?paiement=erreur";return NextResponse.redirect(new URL(target,request.url),303);}
}
