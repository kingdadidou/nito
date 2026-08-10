import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
export async function POST(request:Request){
  try{
    const form=await request.formData();const bookingId=String(form.get("bookingId")??"");const reason=String(form.get("reason")??"Annulation");const requestedReturn=String(form.get("returnTo")??"");
    const supabase=await createClient();if(!supabase)return NextResponse.json({error:"Supabase non configuré"},{status:503});const user=(await supabase.auth.getUser()).data.user;if(!user)return NextResponse.json({error:"Non authentifié"},{status:401});
    const admin=createAdminClient();const {data:booking}=await admin.from("bookings").select("id,participant_id,trip_id,amount,payment_status,stripe_payment_intent_id").eq("id",bookingId).single();if(!booking)return NextResponse.json({error:"Réservation introuvable"},{status:404});
    const {data:trip}=await admin.from("trips").select("organizer_id").eq("id",booking.trip_id).single();const {data:profile}=await admin.from("profiles").select("user_type").eq("id",user.id).single();
    if(user.id!==booking.participant_id&&user.id!==trip?.organizer_id&&profile?.user_type!=="administrateur")return NextResponse.json({error:"Accès refusé"},{status:403});
    if(booking.payment_status!=="paye")return NextResponse.json({error:"Cette réservation ne peut pas être annulée"},{status:409});
    let refundId:string|undefined;
    if(Number(booking.amount)>0){
      if(!booking.stripe_payment_intent_id)return NextResponse.json({error:"Le paiement Stripe est introuvable"},{status:409});
      const refund=await getStripe().refunds.create({payment_intent:booking.stripe_payment_intent_id,reverse_transfer:true,refund_application_fee:true,reason:"requested_by_customer",metadata:{booking_id:booking.id,reason}},{idempotencyKey:`refund:${booking.id}:full`});refundId=refund.id;
      await admin.from("refunds").upsert({booking_id:booking.id,stripe_refund_id:refund.id,amount:Number(booking.amount),reason,requested_by:user.id,status:refund.status==="succeeded"?"rembourse":"en_attente",reverse_transfer:true,refund_application_fee:true},{onConflict:"stripe_refund_id"});
    }
    await admin.from("bookings").update({booking_status:"annulee",cancelled_at:new Date().toISOString(),cancellation_reason:reason}).eq("id",booking.id);
    if(profile?.user_type==="administrateur")await admin.from("admin_audit_logs").insert({admin_id:user.id,action:"create_refund",entity_type:"booking",entity_id:booking.id,details:{refund_id:refundId??null,amount:Number(booking.amount),reason}});
    const returnTo=profile?.user_type==="administrateur"&&requestedReturn==="/administration/reservations"?"/administration/reservations?remboursement=demande":requestedReturn==="/reservations"?"/reservations?remboursement=demande":"/calendrier?remboursement=demande";
    return NextResponse.redirect(new URL(returnTo,request.url),303);
  }catch(error){console.error("Refund Connect",error);return NextResponse.json({error:"Le remboursement a échoué"},{status:500});}
}
