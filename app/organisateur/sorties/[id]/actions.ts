"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getStripe} from "@/lib/stripe/server";
import {getBookingEmailContext,sendTransactionalEmail} from "@/lib/email/server";
import {notifyIndexNow} from "@/lib/indexnow";

async function requireOwner(tripId:string){
  const supabase=await createClient();const user=supabase?(await supabase.auth.getUser()).data.user:null;if(!user)redirect("/connexion");
  const admin=createAdminClient();const {data:trip}=await admin.from("trips").select("id,organizer_id,title,status").eq("id",tripId).single();
  if(!trip||trip.organizer_id!==user.id)redirect("/organisateur");return {user,admin,supabase,trip};
}

export async function updateTrip(form:FormData){
  const tripId=String(form.get("trip_id")??"");const {admin}=await requireOwner(tripId);
  const maximumParticipants=Number(form.get("maximum_participants"));const {data:bookings}=await admin.from("bookings").select("number_of_people").eq("trip_id",tripId).in("booking_status",["confirmee","terminee"]);const booked=(bookings??[]).reduce((sum,b)=>sum+b.number_of_people,0);
  if(!Number.isInteger(maximumParticipants)||maximumParticipants<Math.max(1,booked)||maximumParticipants>100)redirect(`/organisateur/sorties/${tripId}?erreur=capacite`);
  const update={title:String(form.get("title")??"").trim(),description:String(form.get("description")??"").trim(),location:String(form.get("location")??"").trim(),date:String(form.get("date")??""),start_time:String(form.get("start_time")??""),duration:Number(form.get("duration")),maximum_participants:maximumParticipants,equipment:String(form.get("equipment")??"").trim(),registrations_closed:form.get("registrations_closed")==="on"};
  const {error}=await admin.from("trips").update(update).eq("id",tripId);if(error)redirect(`/organisateur/sorties/${tripId}?erreur=modification`);
  const {data:confirmed}=await admin.from("bookings").select("id,participant_id").eq("trip_id",tripId).eq("booking_status","confirmee");const ids=[...new Set((confirmed??[]).map(p=>p.participant_id))];
  if(ids.length)await admin.from("notifications").insert(ids.map(id=>({user_id:id,type:"trip_updated",title:"Une sortie a été modifiée",content:`Les informations de « ${update.title} » ont changé.`,data:{trip_id:tripId}})));
  for(const booking of confirmed??[]){const context=await getBookingEmailContext(booking.id);if(context?.participant?.email)await sendTransactionalEmail({eventKey:`trip-updated:${tripId}:${booking.participant_id}:${Date.now()}`,to:context.participant.email,userId:booking.participant_id,template:"trip_updated",subject:`Sortie modifiée : ${update.title}`,heading:"Votre sortie a été mise à jour",content:"Consultez les nouvelles informations dans votre espace NITO.",actionLabel:"Voir ma réservation",actionUrl:`${process.env.NEXT_PUBLIC_SITE_URL}/reservations`});}
  await notifyIndexNow(["/","/explorer",`/sorties/${tripId}`,"/sitemap.xml"]);
  redirect(`/organisateur/sorties/${tripId}?succes=modifiee`);
}

export async function cancelTrip(form:FormData){
  const tripId=String(form.get("trip_id")??"");const reason=String(form.get("reason")??"").trim();if(reason.length<5)redirect(`/organisateur/sorties/${tripId}?erreur=motif`);
  const {user,admin,supabase,trip}=await requireOwner(tripId);if(trip.status==="annulee")redirect(`/organisateur/sorties/${tripId}?succes=annulee`);
  const {data:bookings}=await admin.from("bookings").select("id,participant_id,amount,payment_status,stripe_payment_intent_id,booking_status").eq("trip_id",tripId).in("booking_status",["confirmee","en_attente"]);
  for(const booking of bookings??[]){
    if(booking.payment_status==="paye"&&booking.stripe_payment_intent_id){const refund=await getStripe().refunds.create({payment_intent:booking.stripe_payment_intent_id,reverse_transfer:true,reason:"requested_by_customer",metadata:{booking_id:booking.id,reason}},{idempotencyKey:`trip-cancel:v2:${tripId}:${booking.id}`});await admin.from("refunds").upsert({booking_id:booking.id,stripe_refund_id:refund.id,amount:Number(booking.amount),reason,requested_by:user.id,status:refund.status==="succeeded"?"rembourse":"en_attente",reverse_transfer:true,refund_application_fee:false},{onConflict:"stripe_refund_id"});}
    await admin.from("bookings").update({booking_status:"annulee",cancelled_at:new Date().toISOString(),cancellation_reason:reason}).eq("id",booking.id);
    await admin.from("notifications").insert({user_id:booking.participant_id,type:"trip_cancelled",title:"Sortie annulée",content:`« ${trip.title} » a été annulée. Tout paiement concerné est remboursé.`,data:{trip_id:tripId,booking_id:booking.id}});
    const context=await getBookingEmailContext(booking.id);if(context?.participant?.email)await sendTransactionalEmail({eventKey:`trip-cancelled:${booking.id}`,to:context.participant.email,userId:booking.participant_id,template:"trip_cancelled",subject:`Sortie annulée : ${trip.title}`,heading:"Votre sortie est annulée",content:`Motif : ${reason}. Tout paiement concerné fait l’objet d’un remboursement.`,actionLabel:"Voir mes réservations",actionUrl:`${process.env.NEXT_PUBLIC_SITE_URL}/reservations`});
  }
  const {error}=await supabase!.from("trips").update({status:"annulee",registrations_closed:true,cancellation_reason:reason,cancelled_at:new Date().toISOString()}).eq("id",tripId);if(error)redirect(`/organisateur/sorties/${tripId}?erreur=annulation`);
  await notifyIndexNow(["/","/explorer",`/sorties/${tripId}`,"/sitemap.xml"]);
  redirect(`/organisateur/sorties/${tripId}?succes=annulee`);
}
