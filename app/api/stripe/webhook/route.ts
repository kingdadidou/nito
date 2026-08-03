import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
export const runtime="nodejs";

export async function POST(request:Request){
  const webhookSecret=process.env.STRIPE_WEBHOOK_SECRET,signature=request.headers.get("stripe-signature");
  if(!webhookSecret)return new Response("Webhook Stripe non configuré",{status:503});if(!signature)return new Response("Signature absente",{status:400});
  let event:Stripe.Event;try{event=getStripe().webhooks.constructEvent(await request.text(),signature,webhookSecret);}catch{return new Response("Signature invalide",{status:400});}
  const admin=createAdminClient();const {error:claimError}=await admin.from("stripe_events").insert({stripe_event_id:event.id,event_type:event.type,livemode:event.livemode,connected_account_id:event.account??null});
  if(claimError?.code==="23505")return new Response("Déjà traité");if(claimError)return new Response("Journal indisponible",{status:500});
  try{
    switch(event.type){
      case "checkout.session.completed":case "checkout.session.async_payment_succeeded":{
        const session=event.data.object as Stripe.Checkout.Session;if(session.payment_status!=="paid")break;
        const paymentIntentId=typeof session.payment_intent==="string"?session.payment_intent:session.payment_intent?.id;
        if(!paymentIntentId)throw new Error("PaymentIntent absent");
        const intent=await getStripe().paymentIntents.retrieve(paymentIntentId,{expand:["latest_charge"]});const charge=typeof intent.latest_charge==="object"?intent.latest_charge:null;
        await admin.from("bookings").update({payment_status:"paye",booking_status:"confirmee",stripe_payment_intent_id:intent.id,stripe_charge_id:charge?.id??null,stripe_transfer_id:charge&&typeof charge.transfer==="string"?charge.transfer:null,stripe_application_fee_id:charge&&typeof charge.application_fee==="string"?charge.application_fee:null,payment_failure_reason:null}).eq("id",session.client_reference_id??session.metadata?.booking_id);
        break;
      }
      case "checkout.session.async_payment_failed":case "checkout.session.expired":{
        const session=event.data.object as Stripe.Checkout.Session;await admin.from("bookings").update({payment_status:"echoue",booking_status:"annulee",payment_failure_reason:event.type,cancelled_at:new Date().toISOString()}).eq("id",session.client_reference_id??session.metadata?.booking_id);break;
      }
      case "payment_intent.payment_failed":{
        const intent=event.data.object as Stripe.PaymentIntent;await admin.from("bookings").update({payment_status:"echoue",payment_failure_reason:intent.last_payment_error?.message??"Paiement refusé"}).eq("stripe_payment_intent_id",intent.id);break;
      }
      case "charge.refunded":{
        const charge=event.data.object as Stripe.Charge;if(charge.refunded)await admin.from("bookings").update({payment_status:"rembourse",booking_status:"annulee"}).eq("stripe_charge_id",charge.id);break;
      }
      case "refund.updated":case "refund.created":{
        const refund=event.data.object as Stripe.Refund;const mapped=refund.status==="succeeded"?"rembourse":refund.status==="failed"||refund.status==="canceled"?"echoue":"en_attente";await admin.from("refunds").update({status:mapped}).eq("stripe_refund_id",refund.id);break;
      }
      case "charge.dispute.created":case "charge.dispute.updated":case "charge.dispute.closed":{
        const dispute=event.data.object as Stripe.Dispute;const {data:booking}=await admin.from("bookings").select("id").eq("stripe_charge_id",typeof dispute.charge==="string"?dispute.charge:dispute.charge.id).single();
        await admin.from("payment_disputes").upsert({booking_id:booking?.id??null,stripe_dispute_id:dispute.id,stripe_charge_id:typeof dispute.charge==="string"?dispute.charge:dispute.charge.id,amount:dispute.amount/100,currency:dispute.currency,reason:dispute.reason,status:dispute.status,evidence_due_at:dispute.evidence_details?.due_by?new Date(dispute.evidence_details.due_by*1000).toISOString():null},{onConflict:"stripe_dispute_id"});break;
      }
      case "account.updated":{
        const account=event.data.object as Stripe.Account;await admin.from("organizer_profiles").update({stripe_charges_enabled:account.charges_enabled,stripe_payouts_enabled:account.payouts_enabled}).eq("stripe_connect_account_id",account.id);break;
      }
      case "identity.verification_session.processing":case "identity.verification_session.requires_input":case "identity.verification_session.verified":case "identity.verification_session.canceled":{
        const session=event.data.object as Stripe.Identity.VerificationSession;
        const userId=session.metadata.naturensemble_user_id||session.client_reference_id;
        const status=session.status==="verified"?"verifie":session.status==="processing"?"en_attente":session.last_error?"rejete":"non_soumis";
        await admin.from("identity_checks").update({status,submitted_at:session.status!=="requires_input"?new Date().toISOString():null,verified_at:session.status==="verified"?new Date().toISOString():null,last_error_code:session.last_error?.code??null}).eq("provider_check_id",session.id);
        if(userId)await admin.from("profiles").update({identity_verified:session.status==="verified"}).eq("id",userId);
        break;
      }
      case "payout.created":case "payout.updated":case "payout.paid":case "payout.failed":{
        const payout=event.data.object as Stripe.Payout;if(!event.account)break;const {data:organizer}=await admin.from("organizer_profiles").select("organizer_id").eq("stripe_connect_account_id",event.account).single();if(!organizer)break;
        const status=payout.status==="paid"?"paye":payout.status==="failed"||payout.status==="canceled"?"echoue":payout.status==="pending"?"en_attente":"en_cours";await admin.from("payouts").upsert({organizer_id:organizer.organizer_id,stripe_payout_id:payout.id,amount:payout.amount/100,status,paid_at:payout.status==="paid"?new Date().toISOString():null},{onConflict:"stripe_payout_id"});break;
      }
    }
    await admin.from("stripe_events").update({processed_at:new Date().toISOString()}).eq("stripe_event_id",event.id);return new Response("ok");
  }catch(error){console.error("Stripe webhook",event.id,event.type,error);await admin.from("stripe_events").delete().eq("stripe_event_id",event.id);return new Response("Traitement échoué",{status:500});}
}
