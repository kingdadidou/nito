import Image from "next/image";
import Link from "next/link";
import {notFound} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {defaultTripImage} from "@/lib/trip-display";
import {toggleOrganizerSubscription} from "@/app/abonnements/actions";
import {PublicMap} from "@/components/public-map";

type WeatherSummary={label:string;icon:string;minimum:number;maximum:number;rain:number};
const organizerLevels:Record<string,string>={passionne_verifie:"Passionné vérifié",association:"Association",professionnel_diplome:"Professionnel diplômé",guide_educateur_sportif:"Guide ou éducateur sportif"};

function weatherLabel(code:number){
  if(code===0)return ["Ciel dégagé","☀️"];
  if(code<=3)return ["Partiellement nuageux","⛅"];
  if(code<=48)return ["Brume ou brouillard","🌫️"];
  if(code<=67)return ["Pluie possible","🌦️"];
  if(code<=77)return ["Neige possible","🌨️"];
  if(code<=82)return ["Averses","🌧️"];
  return ["Risque d’orage","⛈️"];
}

async function getWeather(latitude:number|null,longitude:number|null,date:string):Promise<WeatherSummary|null>{
  if(latitude==null||longitude==null)return null;
  const days=Math.ceil((new Date(`${date}T12:00:00`).getTime()-Date.now())/86400000);
  if(days<0||days>15)return null;
  try{
    const url=new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude",String(latitude));url.searchParams.set("longitude",String(longitude));url.searchParams.set("daily","weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");url.searchParams.set("timezone","Europe/Paris");url.searchParams.set("start_date",date);url.searchParams.set("end_date",date);
    const response=await fetch(url,{next:{revalidate:1800}});if(!response.ok)return null;
    const json=await response.json();const code=Number(json.daily?.weather_code?.[0]);const [label,icon]=weatherLabel(code);
    return {label,icon,minimum:Number(json.daily?.temperature_2m_min?.[0]),maximum:Number(json.daily?.temperature_2m_max?.[0]),rain:Number(json.daily?.precipitation_probability_max?.[0]??0)};
  }catch{return null;}
}

export default async function TripDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{abonnement?:string;paiement?:string;reservation?:string;code?:string}>}){
  const [{id},q]=await Promise.all([params,searchParams]);if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
  const supabase=await createClient();if(!supabase)notFound();
  const {data:trip}=await supabase.from("trips").select("id,title,description,location,approximate_latitude,approximate_longitude,date,start_time,duration,difficulty,maximum_participants,price,equipment,children_allowed,pets_allowed,status,registrations_closed,organizer_id,activity_id,activity:activities(name),organizer:profiles!trips_organizer_id_fkey(id,first_name,last_name,avatar_url,bio,city,identity_verified,average_rating),images:trip_images(public_url,alt_text,position)").eq("id",id).single();
  if(!trip)notFound();
  const activity=Array.isArray(trip.activity)?trip.activity[0]:trip.activity;const organizer=Array.isArray(trip.organizer)?trip.organizer[0]:trip.organizer;const images=[...(trip.images??[])].sort((a,b)=>a.position-b.position);
  const admin=createAdminClient();
  const [{data:confirmedBookings},{data:organizerDetails},{data:reviews},{data:similarTrips}]=await Promise.all([
    admin.from("bookings").select("number_of_people").eq("trip_id",trip.id).in("booking_status",["confirmee","terminee"]),
    admin.from("organizer_profiles").select("organizer_level,affiliation_name,qualification_verified,insurance_verified").eq("organizer_id",trip.organizer_id).maybeSingle(),
    supabase.from("reviews").select("id,rating,comment,created_at,author:profiles!reviews_author_id_fkey(first_name,last_name)").eq("recipient_id",trip.organizer_id).eq("moderation_status","publie").order("created_at",{ascending:false}).limit(3),
    supabase.from("trips").select("id,title,location,date,price,images:trip_images(public_url,alt_text,position)").eq("activity_id",trip.activity_id).eq("status","publiee").gte("date",new Date().toISOString().slice(0,10)).neq("id",trip.id).order("date").limit(3),
  ]);
  const booked=(confirmedBookings??[]).reduce((sum,item)=>sum+item.number_of_people,0);const placesLeft=Math.max(0,trip.maximum_participants-booked);
  const user=(await supabase.auth.getUser()).data.user;const viewer=user?(await supabase.from("profiles").select("user_type").eq("id",user.id).single()).data:null;
  const subscription=user&&organizer?.id&&viewer?.user_type==="participant"?(await supabase.from("organizer_subscriptions").select("organizer_id").eq("participant_id",user.id).eq("organizer_id",organizer.id).maybeSingle()).data:null;
  const existingBooking=user?(await supabase.from("bookings").select("id,booking_status").eq("trip_id",trip.id).eq("participant_id",user.id).in("booking_status",["confirmee","terminee"]).maybeSingle()).data:null;
  const exactLocation=user?(await supabase.rpc("get_exact_trip_location",{p_trip_id:trip.id})).data?.[0]:null;
  const weather=await getWeather(trip.approximate_latitude==null?null:Number(trip.approximate_latitude),trip.approximate_longitude==null?null:Number(trip.approximate_longitude),trip.date);
  const organizerName=`${organizer?.first_name??""} ${organizer?.last_name??""}`.trim()||"Organisateur NITO";
  const bookingOpen=trip.status==="publiee"&&!trip.registrations_closed&&placesLeft>0&&new Date(trip.date)>=new Date(new Date().toISOString().slice(0,10));const formAction=Number(trip.price)>0?"/api/create-checkout-session":"/api/bookings/free";
  const start=String(trip.start_time).slice(0,5);const endDate=new Date(`${trip.date}T${start}:00`);endDate.setMinutes(endDate.getMinutes()+trip.duration);const end=endDate.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  const difficultyLabels:Record<string,string>={debutant:"Débutant",intermediaire:"Intermédiaire",avance:"Avancé",expert:"Expert"};
  return <section className="page-shell trip-detail-page">
    {q.reservation&&<p className="form-alert error">{q.reservation==="conditions"?"Acceptez les conditions pour réserver.":"La réservation n’a pas pu être confirmée. Vérifiez les places disponibles ou vos réservations."}</p>}
    {q.abonnement==="suivi"&&<p className="form-alert success">Vous suivez maintenant cet organisateur.</p>}{q.abonnement==="retire"&&<p className="form-alert success">L’organisateur a été retiré de vos abonnements.</p>}{q.abonnement==="erreur"&&<p className="form-alert error">L’abonnement n’a pas pu être modifié.</p>}{q.paiement==="annule"&&<p className="form-alert error">Le paiement a été annulé. Votre place n’est pas confirmée.</p>}{q.paiement==="erreur"&&<p className="form-alert error">Stripe n’a pas pu préparer le paiement. Aucun débit n’a été effectué.</p>}

    <div className={`trip-gallery ${images.length>1?"has-thumbnails":""}`}>
      <div className="detail-cover"><Image src={images[0]?.public_url??defaultTripImage} alt={images[0]?.alt_text??trip.title} fill priority sizes="(max-width: 900px) 100vw, 75vw" unoptimized/><div className="detail-title"><span className="eyebrow">{activity?.name??"Sortie nature"}</span><h1>{trip.title}</h1></div></div>
      {images.length>1&&<div className="trip-gallery-thumbnails">{images.slice(1,5).map((image,index)=><figure key={`${image.public_url}-${index}`}><Image src={image.public_url} alt={image.alt_text??`Photo ${index+2} de ${trip.title}`} fill sizes="(max-width: 600px) 50vw, 250px" unoptimized/>{index===3&&images.length>5&&<span>+{images.length-5} photos</span>}</figure>)}</div>}
    </div>

    <div className="trip-quick-facts"><span>📅 <b>{new Intl.DateTimeFormat("fr-FR",{dateStyle:"long"}).format(new Date(trip.date))}</b></span><span>🕒 <b>{start}–{end}</b></span><span>🥾 <b>{difficultyLabels[trip.difficulty]??trip.difficulty}</b></span><span>👥 <b>{placesLeft} place{placesLeft!==1&&"s"} restante{placesLeft!==1&&"s"}</b></span></div>

    <div className="detail-grid"><div>
      <section className="panel-card trip-description"><h2>À propos de cette sortie</h2><p>{trip.description}</p><div className="feature-pills"><span>{trip.children_allowed?"✓ Enfants acceptés":"Adultes uniquement"}</span><span>{trip.pets_allowed?"✓ Animaux acceptés":"Animaux non acceptés"}</span></div></section>

      <section className="panel-card"><h2>Programme</h2><ol className="trip-program"><li><b>{start} · Accueil du groupe</b><span>Présentation, consignes et préparation au départ.</span></li><li><b>Exploration et activité</b><span>{activity?.name??"Activité nature"} adaptée au niveau {difficultyLabels[trip.difficulty]?.toLowerCase()??trip.difficulty}.</span></li><li><b>{end} · Retour prévu</b><span>Temps d’échange et fin de la sortie. Les horaires restent indicatifs.</span></li></ol></section>

      <section className="panel-card"><h2>Matériel nécessaire</h2><p>{trip.equipment?.trim()||"Prévoyez une tenue adaptée à la météo, de bonnes chaussures et de l’eau."}</p></section>

      {trip.approximate_latitude!=null&&trip.approximate_longitude!=null&&<section className="panel-card"><div className="section-heading-compact"><div><h2>Lieu approximatif</h2><p>{trip.location}</p></div><span className="privacy-badge">Position protégée</span></div><PublicMap points={[{lat:Number(trip.approximate_latitude),lng:Number(trip.approximate_longitude),label:trip.location,exact:false}]}/><small>Le point exact est communiqué uniquement aux participants dont la réservation est confirmée.</small>{exactLocation&&<div className="secure-note"><strong>Votre point de rendez-vous exact</strong><p>{exactLocation.meeting_point}</p></div>}</section>}

      <section className="panel-card organizer-showcase"><div className="organizer-summary">{organizer?.avatar_url?<Image className="organizer-avatar" src={organizer.avatar_url} alt={`Photo de ${organizerName}`} width={76} height={76} unoptimized/>:<span className="organizer-avatar fallback">{organizer?.first_name?.[0]??"N"}{organizer?.last_name?.[0]??""}</span>}<div><span className="eyebrow green">VOTRE ORGANISATEUR</span><h2>{organizerName}</h2><p>★ {Number(organizer?.average_rating??0).toFixed(1)} · {reviews?.length??0} avis récent{reviews?.length!==1&&"s"}</p></div></div><div className="verification-badges">{organizer?.identity_verified&&<span>✓ Identité vérifiée</span>}{organizerDetails?.organizer_level&&<span>✓ {organizerLevels[organizerDetails.organizer_level]??organizerDetails.organizer_level}</span>}{organizerDetails?.qualification_verified&&<span>✓ Qualification vérifiée</span>}{organizerDetails?.insurance_verified&&<span>✓ Assurance vérifiée</span>}</div>{organizer?.bio&&<p>{organizer.bio}</p>}{organizerDetails?.affiliation_name&&<p><b>Structure :</b> {organizerDetails.affiliation_name}</p>}<div className="form-actions">{organizer?.id&&<Link className="secondary" href={`/organisateurs/${organizer.id}`}>Voir le profil et tous les avis</Link>}{organizer?.id&&existingBooking&&<Link className="secondary" href={`/messages?with=${organizer.id}&trip=${trip.id}`}>Contacter l’organisateur</Link>}{organizer?.id&&viewer?.user_type==="participant"?<form action={toggleOrganizerSubscription}><input type="hidden" name="organizer_id" value={organizer.id}/><input type="hidden" name="trip_id" value={trip.id}/><button className={subscription?"secondary":"primary"} name="operation" value={subscription?"ne_plus_suivre":"suivre"}>{subscription?"Ne plus suivre":"Suivre"}</button></form>:!user?<Link className="secondary" href={`/connexion?next=/sorties/${trip.id}`}>Se connecter pour suivre</Link>:null}</div></section>

      <section className="panel-card"><div className="section-heading-compact"><h2>Avis sur l’organisateur</h2>{organizer?.id&&<Link className="text-link" href={`/organisateurs/${organizer.id}`}>Tous les avis</Link>}</div>{!reviews?.length?<p>Aucun avis publié pour le moment. Soyez parmi les premiers à partager votre expérience après la sortie.</p>:reviews.map(review=>{const author=Array.isArray(review.author)?review.author[0]:review.author;return <article className="review-card compact-review" key={review.id}><strong>{"★".repeat(review.rating)} <span>{review.rating}/5</span></strong><p>{review.comment}</p><small>{author?.first_name??"Participant NITO"} · {new Intl.DateTimeFormat("fr-FR",{dateStyle:"long"}).format(new Date(review.created_at))}</small></article>})}</section>

      <section className="panel-card cancellation-summary"><h2>Annulation en bref</h2><p>Vous pouvez gérer votre annulation depuis « Mes réservations ». Le remboursement dépend du délai avant la sortie et des circonstances prévues par la politique NITO.</p><Link className="text-link" href="/annulations">Consulter la politique complète →</Link></section>
    </div>

      <aside className="booking-column"><section className="panel-card booking-card"><span className="big-price">{Number(trip.price)===0?"Gratuit":`${Number(trip.price).toFixed(2)} €`}</span>{Number(trip.price)>0&&" par personne"}<p>📅 {new Intl.DateTimeFormat("fr-FR",{dateStyle:"long"}).format(new Date(trip.date))} à {start}</p><p>📍 {trip.location}</p><div className={`availability-meter ${placesLeft<=3?"limited":""}`}><div><strong>{placesLeft}</strong> place{placesLeft!==1&&"s"} disponible{placesLeft!==1&&"s"}</div><progress max={trip.maximum_participants} value={booked}/><small>{booked} réservation{booked!==1&&"s"} sur {trip.maximum_participants}</small></div>
        {existingBooking?<><p className="form-alert success">Votre réservation est confirmée.</p><Link className="primary wide" href="/reservations">Gérer ma réservation</Link></>:bookingOpen?<form action={formAction} method="post"><input type="hidden" name="tripId" value={trip.id}/><label>Participants<input name="quantity" type="number" min="1" max={Math.min(20,placesLeft)} defaultValue="1"/></label><label className="legal-consent"><input type="checkbox" name="booking_terms" value="accepted" required/><span>J’accepte les <Link href="/conditions" target="_blank">conditions de réservation</Link> et la <Link href="/annulations" target="_blank">politique d’annulation</Link>.</span></label><button className="primary wide">{Number(trip.price)>0?"Réserver et payer":"Réserver gratuitement"}</button></form>:<p>{trip.registrations_closed?"Les inscriptions ont été fermées par l’organisateur.":placesLeft===0?"Cette sortie est complète.":"Cette sortie n’est plus ouverte à la réservation."}</p>}
        {Number(trip.price)>0&&<small className="payment-disclaimer">Paiement sécurisé par Stripe · Commission NITO incluse</small>}</section>
        <section className="panel-card weather-card"><div className="weather-title"><span>{weather?.icon??"🌤️"}</span><div><small>MÉTÉO INDICATIVE</small><h3>{weather?.label??"Prévision bientôt disponible"}</h3></div></div>{weather&&<p><b>{Math.round(weather.minimum)}–{Math.round(weather.maximum)} °C</b> · {Math.round(weather.rain)} % de risque de pluie</p>}<small>Prévision susceptible d’évoluer. Vérifiez-la avant votre départ.</small></section>
      </aside>
    </div>

    {!!similarTrips?.length&&<section className="similar-trips"><div className="section-heading-compact"><div><span className="eyebrow green">POURSUIVEZ L’EXPLORATION</span><h2>Sorties similaires</h2></div><Link className="secondary" href={`/explorer?activite=${encodeURIComponent(activity?.name??"")}`}>Voir toutes les sorties</Link></div><div className="card-grid">{similarTrips.map(similar=>{const similarImages=[...(similar.images??[])].sort((a,b)=>a.position-b.position);return <Link className="trip-card" href={`/sorties/${similar.id}`} key={similar.id}><div className="trip-image"><Image src={similarImages[0]?.public_url??defaultTripImage} alt={similarImages[0]?.alt_text??similar.title} fill sizes="(max-width: 700px) 100vw, 33vw" unoptimized/><span className="price">{Number(similar.price)===0?"Gratuit":`${Number(similar.price).toFixed(0)} €`}</span></div><div className="trip-body"><h3>{similar.title}</h3><p className="trip-meta">{new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(similar.date))} · {similar.location}</p></div></Link>})}</div></section>}
  </section>;
}
