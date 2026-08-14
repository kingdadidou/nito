import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getBookingEmailContext,sendTransactionalEmail} from "@/lib/email/server";

export async function POST(request: Request) {
  try {
    const form=await request.formData();const tripId=String(form.get("tripId")??"");const quantity=Number(form.get("quantity")??1);
    if(form.get("booking_terms")!=="accepted")return NextResponse.redirect(new URL(`/sorties/${tripId}?reservation=conditions`,request.url),303);
    if(!/^[0-9a-f-]{36}$/i.test(tripId)||!Number.isInteger(quantity))return NextResponse.redirect(new URL(`/sorties/${tripId}?reservation=invalide`,request.url),303);
    const supabase=await createClient();if(!supabase)return NextResponse.json({error:"Supabase non configuré"},{status:503});
    const user=(await supabase.auth.getUser()).data.user;if(!user)return NextResponse.redirect(new URL(`/connexion?next=/sorties/${tripId}`,request.url),303);
    const {data,error}=await supabase.rpc("reserve_free_trip",{p_trip_id:tripId,p_number_of_people:quantity});const booking=data?.[0];
    if(error||!booking)return NextResponse.redirect(new URL(`/sorties/${tripId}?reservation=impossible`,request.url),303);
    const context=await getBookingEmailContext(booking.booking_id);const admin=createAdminClient();
    if(context?.trip)await admin.from("notifications").insert([
      {user_id:context.participant_id,type:"booking_confirmed",title:"Réservation confirmée",content:`Votre place pour « ${context.trip.title} » est confirmée.`,data:{trip_id:context.trip.id,booking_id:booking.booking_id}},
      {user_id:context.trip.organizer_id,type:"organizer_new_booking",title:"Nouvelle réservation",content:`${context.participant?.first_name||"Un participant"} a réservé ${context.number_of_people} place(s) pour « ${context.trip.title} ».`,data:{trip_id:context.trip.id,booking_id:booking.booking_id}},
    ]);
    if(context?.participant?.email&&context.trip)await sendTransactionalEmail({eventKey:`booking-confirmed:${booking.booking_id}`,to:context.participant.email,userId:context.participant_id,template:"booking_confirmed",subject:`Réservation confirmée : ${context.trip.title}`,heading:"Votre réservation est confirmée",content:`Votre réservation de ${context.number_of_people} place(s) pour ${context.trip.title} est confirmée. Aucun paiement n’est nécessaire.`,actionLabel:"Voir ma réservation",actionUrl:`${process.env.NEXT_PUBLIC_SITE_URL}/reservations`});
    if(context?.organizer?.email&&context.trip)await sendTransactionalEmail({eventKey:`organizer-new-booking:${booking.booking_id}`,to:context.organizer.email,userId:context.trip.organizer_id,template:"organizer_new_booking",subject:`Nouvelle réservation : ${context.trip.title}`,heading:"Vous avez une nouvelle réservation",content:`${context.participant?.first_name||"Un participant"} a réservé ${context.number_of_people} place(s) pour ${context.trip.title}.`,actionLabel:"Voir les participants",actionUrl:`${process.env.NEXT_PUBLIC_SITE_URL}/organisateur/sorties/${context.trip.id}`});
    return NextResponse.redirect(new URL(`/reservation/confirmation?booking_id=${booking.booking_id}`,request.url),303);
  }catch(error){console.error("Free booking",error);return NextResponse.json({error:"Réservation impossible"},{status:500});}
}
