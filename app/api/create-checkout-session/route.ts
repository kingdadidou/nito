import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { eurosToCents,getStripe } from "@/lib/stripe/server";
import {getBookingEmailContext,sendTransactionalEmail} from "@/lib/email/server";
export async function POST(request:Request){
  try{
    const form=await request.formData();const tripId=String(form.get("tripId")??"");const quantity=Number(form.get("quantity")??1);
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
      const account=await getStripe().accounts.retrieve(organizer.stripe_connect_account_id);
      await admin.from("organizer_profiles").update({stripe_charges_enabled:account.charges_enabled,stripe_payouts_enabled:account.payouts_enabled}).eq("organizer_id",trip.organizer_id);
      if(!account.charges_enabled||!account.payouts_enabled)return NextResponse.redirect(new URL(`/sorties/${tripId}?paiement=organisateur_incomplet`,request.url),303);
    }
    const {data,error}=await supabase.rpc("prepare_booking",{p_trip_id:tripId,p_number_of_people:quantity});
    if(error||!data?.[0])return NextResponse.json({error:error?.message??"Réservation impossible"},{status:409});
    const prepared=data[0];
    if(Number(prepared.amount)===0){await admin.from("bookings").update({payment_status:"paye",booking_status:"confirmee"}).eq("id",prepared.booking_id);const context=await getBookingEmailContext(prepared.booking_id);if(context?.participant?.email&&context.trip)await sendTransactionalEmail({eventKey:`booking-confirmed:${prepared.booking_id}`,to:context.participant.email,userId:context.participant_id,template:"booking_confirmed",subject:`Réservation confirmée : ${context.trip.title}`,heading:"Votre réservation est confirmée",content:`Votre réservation de ${context.number_of_people} place(s) pour ${context.trip.title} est confirmée. Cette sortie est gratuite.`,actionLabel:"Voir mon calendrier",actionUrl:`${process.env.NEXT_PUBLIC_SITE_URL}/calendrier`});if(context?.organizer?.email&&context.trip)await sendTransactionalEmail({eventKey:`organizer-new-booking:${prepared.booking_id}`,to:context.organizer.email,userId:context.trip.organizer_id,template:"organizer_new_booking",subject:`Nouvelle réservation : ${context.trip.title}`,heading:"Vous avez une nouvelle réservation",content:`${context.participant?.first_name||"Un participant"} a réservé ${context.number_of_people} place(s) pour ${context.trip.title}.`,actionLabel:"Ouvrir mon tableau de bord",actionUrl:`${process.env.NEXT_PUBLIC_SITE_URL}/organisateur`});return NextResponse.redirect(new URL("/calendrier?reservation=confirmee",request.url),303);}
    if(!organizer?.stripe_connect_account_id)return NextResponse.redirect(new URL(`/sorties/${tripId}?paiement=organisateur_incomplet`,request.url),303);
    const stripe=getStripe();
    const origin=process.env.NEXT_PUBLIC_SITE_URL??new URL(request.url).origin;
    const session=await stripe.checkout.sessions.create({mode:"payment",customer_email:user.email,line_items:[{quantity:1,price_data:{currency:"eur",unit_amount:eurosToCents(Number(prepared.amount)),product_data:{name:prepared.trip_title,description:`${quantity} participant${quantity>1?"s":""}`}}}],client_reference_id:prepared.booking_id,metadata:{booking_id:prepared.booking_id,trip_id:tripId,participant_id:user.id},payment_intent_data:{application_fee_amount:eurosToCents(Number(prepared.platform_fee)),transfer_data:{destination:organizer.stripe_connect_account_id},metadata:{booking_id:prepared.booking_id,trip_id:tripId}},success_url:`${origin}/calendrier?reservation=confirmee&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/sorties/${tripId}?paiement=annule`},{idempotencyKey:`checkout:${prepared.booking_id}`});
    const {error:updateError}=await admin.from("bookings").update({stripe_checkout_session_id:session.id}).eq("id",prepared.booking_id);if(updateError)throw updateError;
    return NextResponse.redirect(session.url!,303);
  }catch(error){console.error("Checkout Connect",error);return NextResponse.json({error:"Impossible de créer le paiement"},{status:500});}
}
