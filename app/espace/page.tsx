import Link from "next/link";
import {redirect} from "next/navigation";
import {DashboardNav} from "@/components/dashboard-nav";
import {createClient} from "@/lib/supabase/server";

export const metadata={title:"Mon espace participant"};

export default async function ParticipantDashboard(){
  const supabase=await createClient();const user=supabase?(await supabase.auth.getUser()).data.user:null;if(!user)redirect("/connexion");
  const {data:profile}=await supabase!.from("profiles").select("first_name,user_type").eq("id",user.id).single();if(profile?.user_type==="organisateur")redirect("/organisateur");if(profile?.user_type==="administrateur")redirect("/administration");
  const now=new Date();
  const [{data:bookings},{count:subscriptions},{count:unreadMessages},{count:unreadNotifications},{data:writtenReviews}]=await Promise.all([
    supabase!.from("bookings").select("id,booking_status,payment_status,number_of_people,trip:trips(id,title,date,start_time,location,organizer_id)").eq("participant_id",user.id).in("booking_status",["confirmee","terminee"]).order("created_at",{ascending:false}),
    supabase!.from("organizer_subscriptions").select("organizer_id",{count:"exact",head:true}).eq("participant_id",user.id),
    supabase!.from("messages").select("id",{count:"exact",head:true}).eq("receiver_id",user.id).is("read_at",null),
    supabase!.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",user.id).is("read_at",null),
    supabase!.from("reviews").select("trip_id").eq("author_id",user.id),
  ]);
  const normalized=(bookings??[]).map(booking=>({booking,trip:Array.isArray(booking.trip)?booking.trip[0]:booking.trip})).filter(item=>item.trip);const upcoming=normalized.filter(item=>new Date(`${item.trip!.date}T${item.trip!.start_time}`)>=now&&item.booking.booking_status==="confirmee").sort((a,b)=>new Date(`${a.trip!.date}T${a.trip!.start_time}`).getTime()-new Date(`${b.trip!.date}T${b.trip!.start_time}`).getTime());const reviewed=new Set((writtenReviews??[]).map(item=>item.trip_id));const reviewsToWrite=normalized.filter(item=>new Date(`${item.trip!.date}T${item.trip!.start_time}`)<now&&!reviewed.has(item.trip!.id)).length;
  const cards=[
    {icon:"📅",title:"Prochaines sorties",value:upcoming.length,description:upcoming[0]?`${upcoming[0].trip!.title} · ${new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(upcoming[0].trip!.date))}`:"Aucune sortie programmée",href:"/calendrier",action:"Voir mon calendrier"},
    {icon:"🎟️",title:"Réservations",value:normalized.length,description:"Confirmations, justificatifs et annulations.",href:"/reservations",action:"Gérer mes réservations"},
    {icon:"🌿",title:"Abonnements",value:subscriptions??0,description:"Les organisateurs que vous suivez.",href:"/abonnements",action:"Voir mes abonnements"},
    {icon:"💬",title:"Messages",value:unreadMessages??0,description:(unreadMessages??0)>0?"Message(s) privé(s) non lu(s).":"Conversations et groupes de sorties.",href:"/messages",action:"Ouvrir la messagerie"},
    {icon:"★",title:"Avis à publier",value:reviewsToWrite,description:reviewsToWrite?"Partagez votre expérience.":"Aucun avis en attente.",href:"/avis",action:"Gérer mes avis"},
  ];
  return <section className="page-shell role-dashboard"><DashboardNav role="participant"/><div className="page-header"><div><span className="eyebrow green">ESPACE PARTICIPANT</span><h1>Bonjour{profile?.first_name?`, ${profile.first_name}`:""}</h1><p>Tout ce qui concerne vos sorties, au même endroit.</p></div><Link className="primary" href="/explorer">Découvrir une sortie</Link></div>{(unreadNotifications??0)>0&&<Link className="dashboard-alert" href="/notifications"><b>🔔 {unreadNotifications} notification{unreadNotifications!==1&&"s"} non lue{unreadNotifications!==1&&"s"}</b><span>Consulter →</span></Link>}<div className="role-action-grid">{cards.map(card=><Link className="role-action-card" href={card.href} key={card.href}><span className="role-action-icon">{card.icon}</span><div><span>{card.title}</span><strong>{card.value}</strong><p>{card.description}</p><b>{card.action} →</b></div></Link>)}</div>{upcoming.length>0&&<section className="panel-card"><div className="section-heading-compact"><h2>Vos prochaines sorties</h2><Link className="text-link" href="/calendrier">Tout le calendrier</Link></div>{upcoming.slice(0,3).map(({booking,trip})=><div className="admin-row" key={booking.id}><span><b>{trip!.title}</b><small>{new Intl.DateTimeFormat("fr-FR",{dateStyle:"long"}).format(new Date(trip!.date))} à {String(trip!.start_time).slice(0,5)} · {trip!.location}</small></span><Link className="secondary" href={`/sorties/${trip!.id}`}>Voir la sortie</Link></div>)}</section>}</section>;
}
