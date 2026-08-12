import Link from "next/link";
import {redirect} from "next/navigation";
import {DashboardNav} from "@/components/dashboard-nav";
import {createClient} from "@/lib/supabase/server";
import {submitReview} from "./actions";

export const metadata={title:"Mes avis"};

export default async function Reviews({searchParams}:{searchParams:Promise<{succes?:string;erreur?:string}>}){
  const q=await searchParams;
  const supabase=await createClient();if(!supabase)redirect("/connexion");
  const user=(await supabase.auth.getUser()).data.user;if(!user)redirect("/connexion");
  const {data:profile}=await supabase.from("profiles").select("user_type").eq("id",user.id).single();
  const {data:bookings}=await supabase.from("bookings").select("trip_id,booking_status,trip:trips(id,title,date,start_time,organizer_id,organizer:profiles!trips_organizer_id_fkey(first_name,last_name))").eq("participant_id",user.id).in("booking_status",["confirmee","terminee"]);
  const {data:written}=await supabase.from("reviews").select("id,trip_id,rating,comment,created_at,moderation_status,trip:trips(title),recipient:profiles!reviews_recipient_id_fkey(first_name,last_name)").eq("author_id",user.id).order("created_at",{ascending:false});
  const writtenTrips=new Set((written??[]).map(review=>review.trip_id));
  const eligible=(bookings??[]).flatMap(item=>{const trip=Array.isArray(item.trip)?item.trip[0]:item.trip;return !trip||writtenTrips.has(trip.id)||new Date(`${trip.date}T${trip.start_time}`)>=new Date()?[]:[trip]});
  return <section className="page-shell"><DashboardNav role={profile?.user_type??"participant"}/><span className="eyebrow green">VOTRE EXPÉRIENCE</span><h1>Mes avis</h1>
    {q.succes&&<p className="form-alert success">Merci, votre avis est publié.</p>}
    {q.erreur&&<p className="form-alert error">{q.erreur==="existant"?"Vous avez déjà évalué cette sortie.":q.erreur==="champs"?"Choisissez une note et rédigez au moins 10 caractères.":"Cette réservation n’est pas encore éligible à un avis."}</p>}
    <section className="panel-card"><h2>Sorties à évaluer</h2><p>Vous pouvez laisser un avis une fois la sortie terminée. Une seule évaluation est autorisée par réservation.</p>{!eligible.length?<p>Aucune sortie à évaluer pour le moment.</p>:eligible.map(trip=>{const organizer=Array.isArray(trip.organizer)?trip.organizer[0]:trip.organizer;return <form className="review-form" action={submitReview} key={trip.id}><h3>{trip.title}</h3><p>Organisée par {organizer?.first_name} {organizer?.last_name}</p><input type="hidden" name="trip_id" value={trip.id}/><input type="hidden" name="recipient_id" value={trip.organizer_id}/><label>Note<select name="rating" required defaultValue=""><option value="" disabled>Choisir</option>{[5,4,3,2,1].map(n=><option key={n} value={n}>{"★".repeat(n)} — {n}/5</option>)}</select></label><label>Votre commentaire<textarea name="comment" minLength={10} maxLength={4000} rows={4} required placeholder="Décrivez votre expérience avec précision…"/></label><button className="primary">Publier mon avis</button></form>})}</section>
    <section className="panel-card"><h2>Avis déjà publiés</h2>{!written?.length?<p>Vous n’avez encore publié aucun avis.</p>:written.map(review=>{const trip=Array.isArray(review.trip)?review.trip[0]:review.trip;const recipient=Array.isArray(review.recipient)?review.recipient[0]:review.recipient;return <article className="review-card" key={review.id}><strong>{"★".repeat(review.rating)} <span>{review.rating}/5</span></strong><p>{review.comment}</p><small>{trip?.title} · {recipient?.first_name} {recipient?.last_name} · {new Intl.DateTimeFormat("fr-FR",{dateStyle:"long"}).format(new Date(review.created_at))}{review.moderation_status==="masque"?" · Masqué par la modération":""}</small></article>})}</section>
    <p><Link className="secondary" href="/explorer">Découvrir d’autres sorties</Link></p></section>;
}
