import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getStripe} from "@/lib/stripe/server";
import {getBookingEmailContext,sendTransactionalEmail} from "@/lib/email/server";

export async function POST(request:Request){
  try{
    const form=await request.formData();const bookingId=String(form.get("bookingId")??"");const reason=String(form.get("reason")??"Annulation");const requestedReturn=String(form.get("returnTo")??"");
    const supabase=await createClient();if(!supabase)return NextResponse.json({error:"Supabase non configuré"},{status:503});const user=(await supabase.auth.getUser()).data.user;if(!user)return NextResponse.json({error:"Non authentifié"},{status:401});
    const admin=createAdminClient();const {data:booking}=await admin.from("bookings").select("id,participant_id,trip_id,amount,payment_status,booking_status,stripe_payment_intent_id").eq("id",bookingId).single();if(!booking)return NextResponse.json({error:"Réservation introuvable"},{status:404});
    const {data:trip}=await admin.from("trips").select("organizer_id,title,date,start_time").eq("id",booking.trip_id).single();const {data:profile}=await admin.from("profiles").select("user_type").eq("id",user.id).single();
    if(user.id!==booking.participant_id&&user.id!==trip?.organizer_id&&profile?.user_type!=="administrateur")return NextResponse.json({error:"Accès refusé"},{status:403});
    if(booking.payment_status!=="paye"||booking.booking_status!=="confirmee")return NextResponse.json({error:"Cette réservation ne peut pas être annulée"},{status:409});
    if(trip&&new Date(`${trip.date}T${trip.start_time}`)<=new Date())return NextResponse.json({error:"Une sortie commencée ne peut plus être annulée depuis cet espace"},{status:409});
    const free=Number(booking.amount)===0;let refundId:string|undefined;
    if(!free){
      if(!booking.stripe_payment_intent_id)return NextResponse.json({error:"Le paiement Stripe est introuvable"},{status:409});
      const refund=await getStripe().refunds.create({payment_intent:booking.stripe_payment_intent_id,reverse_transfer:true,reason:"requested_by_customer",metadata:{booking_id:booking.id,reason}},{idempotencyKey:`refund:v2:${booking.id}:full`});refundId=refund.id;
      await admin.from("refunds").upsert({booking_id:booking.id,stripe_refund_id:refund.id,amount:Number(booking.amount),reason,requested_by:user.id,status:refund.status==="succeeded"?"rembourse":"en_attente",reverse_transfer:true,refund_application_fee:false},{onConflict:"stripe_refund_id"});
    }
    const {error:updateError}=await admin.from("bookings").update({booking_status:"annulee",cancelled_at:new Date().toISOString(),cancellation_reason:reason}).eq("id",booking.id).eq("booking_status","confirmee");
    if(updateError)throw updateError;
    const context=await getBookingEmailContext(booking.id);
    if(context?.trip){
      await admin.from("notifications").insert([
        {user_id:booking.participant_id,type:"booking_cancelled",title:"Réservation annulée",content:`Votre réservation pour « ${context.trip.title} » est annulée.`,data:{trip_id:booking.trip_id,booking_id:booking.id}},
        {user_id:context.trip.organizer_id,type:"participant_cancelled",title:"Un participant a annulé",content:`${context.participant?.first_name||"Un participant"} a annulé sa réservation pour « ${context.trip.title} ».`,data:{trip_id:booking.trip_id,booking_id:booking.id}},
      ]);
    }
    if(context?.participant?.email&&context.trip)await sendTransactionalEmail({eventKey:`booking-cancelled:${booking.id}`,to:context.participant.email,userId:booking.participant_id,template:"booking_cancelled",subject:`Réservation annulée : ${context.trip.title}`,heading:"Votre réservation est annulée",content:free?"Votre réservation gratuite a bien été annulée. Aucun débit ni remboursement n’est nécessaire.":"Votre réservation a été annulée et votre remboursement a été demandé.",actionLabel:"Voir mes réservations",actionUrl:`${process.env.NEXT_PUBLIC_SITE_URL}/reservations`});
    if(context?.organizer?.email&&context.trip)await sendTransactionalEmail({eventKey:`participant-cancelled:${booking.id}`,to:context.organizer.email,userId:context.trip.organizer_id,template:"participant_cancelled",subject:`Annulation d’une réservation : ${context.trip.title}`,heading:"Un participant a annulé",content:`${context.participant?.first_name||"Un participant"} a annulé ${context.number_of_people} place(s). Elles sont de nouveau disponibles.`,actionLabel:"Voir les participants",actionUrl:`${process.env.NEXT_PUBLIC_SITE_URL}/organisateur/sorties/${context.trip.id}`});
    if(profile?.user_type==="administrateur")await admin.from("admin_audit_logs").insert({admin_id:user.id,action:free?"cancel_free_booking":"create_refund",entity_type:"booking",entity_id:booking.id,details:{refund_id:refundId??null,amount:Number(booking.amount),reason}});
    const participantReturn=free?"/reservations?annulation=confirmee":"/reservations?remboursement=demande";
    const returnTo=profile?.user_type==="administrateur"&&requestedReturn==="/administration/reservations"?"/administration/reservations?remboursement=demande":requestedReturn==="/reservations"?participantReturn:"/calendrier?remboursement=demande";
    return NextResponse.redirect(new URL(returnTo,request.url),303);
  }catch(error){console.error("Booking cancellation",error);return NextResponse.json({error:"L’annulation a échoué"},{status:500});}
}
