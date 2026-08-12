import Image from "next/image";
import Link from "next/link";
import {notFound} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {defaultTripImage} from "@/lib/trip-display";
import {toggleOrganizerSubscription} from "@/app/abonnements/actions";

export default async function TripDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{abonnement?:string;paiement?:string;reservation?:string}>}) {
  const [{id},q]=await Promise.all([params,searchParams]);if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
  const supabase=await createClient();if(!supabase)notFound();
  const {data:trip}=await supabase.from("trips").select("id,title,description,location,date,start_time,duration,difficulty,maximum_participants,price,status,registrations_closed,organizer_id,activity:activities(name),organizer:profiles!trips_organizer_id_fkey(id,first_name,last_name,average_rating),images:trip_images(public_url,alt_text,position)").eq("id",id).single();
  if(!trip)notFound();
  const activity=Array.isArray(trip.activity)?trip.activity[0]:trip.activity;const organizer=Array.isArray(trip.organizer)?trip.organizer[0]:trip.organizer;const image=[...(trip.images??[])].sort((a,b)=>a.position-b.position)[0];
  const admin=createAdminClient();const {data:confirmedBookings}=await admin.from("bookings").select("number_of_people").eq("trip_id",trip.id).in("booking_status",["confirmee","terminee"]);const booked=(confirmedBookings??[]).reduce((sum,item)=>sum+item.number_of_people,0);
  const user=(await supabase.auth.getUser()).data.user;const viewer=user?(await supabase.from("profiles").select("user_type").eq("id",user.id).single()).data:null;
  const subscription=user&&organizer?.id&&viewer?.user_type==="participant"?(await supabase.from("organizer_subscriptions").select("organizer_id").eq("participant_id",user.id).eq("organizer_id",organizer.id).maybeSingle()).data:null;
  const existingBooking=user?(await supabase.from("bookings").select("id,booking_status").eq("trip_id",trip.id).eq("participant_id",user.id).in("booking_status",["confirmee","terminee"]).maybeSingle()).data:null;
  const exactLocation=user?(await supabase.rpc("get_exact_trip_location",{p_trip_id:trip.id})).data?.[0]:null;
  const placesLeft=Math.max(0,trip.maximum_participants-booked);const bookingOpen=trip.status==="publiee"&&!trip.registrations_closed&&placesLeft>0&&new Date(trip.date)>=new Date(new Date().toISOString().slice(0,10));
  const formAction=Number(trip.price)>0?"/api/create-checkout-session":"/api/bookings/free";
  return <section className="page-shell">
    {q.reservation&&<p className="form-alert error">{q.reservation==="conditions"?"Acceptez les conditions pour réserver.":"La réservation n’a pas pu être confirmée. Vérifiez les places disponibles ou vos réservations."}</p>}
    {q.abonnement==="suivi"&&<p className="form-alert success">Vous suivez maintenant cet organisateur.</p>}{q.abonnement==="retire"&&<p className="form-alert success">L’organisateur a été retiré de vos abonnements.</p>}{q.abonnement==="erreur"&&<p className="form-alert error">L’abonnement n’a pas pu être modifié.</p>}{q.paiement==="annule"&&<p className="form-alert error">Le paiement a été annulé. Votre place n’est pas confirmée.</p>}
    <div className="detail-cover"><Image src={image?.public_url??defaultTripImage} alt={image?.alt_text??trip.title} fill priority sizes="100vw" unoptimized/><div className="detail-title"><span className="eyebrow">{activity?.name??"Sortie nature"}</span><h1>{trip.title}</h1></div></div>
    <div className="detail-grid"><div><section className="panel-card"><h2>À propos de cette sortie</h2><p>{trip.description}</p><p><strong>Niveau :</strong> {trip.difficulty} · <strong>Durée :</strong> {trip.duration} minutes</p>{exactLocation&&<div className="secure-note"><strong>Point de rendez-vous réservé aux participants confirmés :</strong><p>{exactLocation.meeting_point}</p></div>}</section>
      <section className="panel-card"><h3>Votre organisateur</h3><p><strong>{organizer?.first_name} {organizer?.last_name}</strong> · ★ {Number(organizer?.average_rating??0).toFixed(1)}</p>{organizer?.id&&existingBooking&&<p><Link className="secondary" href={`/messages?with=${organizer.id}&trip=${trip.id}`}>Contacter l’organisateur</Link></p>}{organizer?.id&&viewer?.user_type==="participant"?<form action={toggleOrganizerSubscription}><input type="hidden" name="organizer_id" value={organizer.id}/><input type="hidden" name="trip_id" value={trip.id}/><button className={subscription?"secondary":"primary"} name="operation" value={subscription?"ne_plus_suivre":"suivre"}>{subscription?"Ne plus suivre":"Suivre cet organisateur"}</button></form>:!user?<Link className="secondary" href={`/connexion?next=/sorties/${trip.id}`}>Connectez-vous pour suivre cet organisateur</Link>:null}</section></div>
      <aside className="panel-card booking-card"><span className="big-price">{Number(trip.price)===0?"Gratuit":`${Number(trip.price).toFixed(2)} €`}</span>{Number(trip.price)>0&&" par personne"}<p>{new Intl.DateTimeFormat("fr-FR",{dateStyle:"long"}).format(new Date(trip.date))} à {String(trip.start_time).slice(0,5)}</p><p>{trip.location}</p><p>{placesLeft} places disponibles</p>
        {existingBooking?<><p className="form-alert success">Votre réservation est confirmée.</p><Link className="primary wide" href="/reservations">Gérer ma réservation</Link></>:bookingOpen?<form action={formAction} method="post"><input type="hidden" name="tripId" value={trip.id}/><label>Participants<input name="quantity" type="number" min="1" max={Math.min(20,placesLeft)} defaultValue="1"/></label><label className="legal-consent"><input type="checkbox" name="booking_terms" value="accepted" required/><span>J’accepte les <Link href="/conditions" target="_blank">conditions de réservation</Link> et la <Link href="/annulations" target="_blank">politique d’annulation</Link>.</span></label><button className="primary wide">{Number(trip.price)>0?"Réserver et payer":"Réserver gratuitement"}</button></form>:<p>{trip.registrations_closed?"Les inscriptions ont été fermées par l’organisateur.":placesLeft===0?"Cette sortie est complète.":"Cette sortie n’est plus ouverte à la réservation."}</p>}
        {Number(trip.price)>0&&<small className="payment-disclaimer">Paiement sécurisé par Stripe · Commission NITO incluse</small>}
      </aside></div>
  </section>;
}
