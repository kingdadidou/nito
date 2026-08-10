import Link from "next/link";
import {redirect} from "next/navigation";
import {DashboardNav} from "@/components/dashboard-nav";
import {createClient} from "@/lib/supabase/server";

export const metadata={title:"Espace organisateur"};

export default async function Organizer(){
  const supabase=await createClient();
  if(!supabase)return null;
  const user=(await supabase.auth.getUser()).data.user;
  if(!user)redirect("/connexion");
  const today=new Date().toISOString().slice(0,10);
  const [{count:active},{count:followers},{data:trips},{data:reviews},{data:ownedTrips}]=await Promise.all([
    supabase.from("trips").select("id",{count:"exact",head:true}).eq("organizer_id",user.id).eq("status","publiee").gte("date",today),
    supabase.from("organizer_subscriptions").select("participant_id",{count:"exact",head:true}).eq("organizer_id",user.id),
    supabase.from("trips").select("id,title,date,start_time,location,status").eq("organizer_id",user.id).gte("date",today).order("date").limit(10),
    supabase.from("reviews").select("rating").eq("recipient_id",user.id),
    supabase.from("trips").select("id").eq("organizer_id",user.id),
  ]);
  const tripIds=(ownedTrips??[]).map(trip=>trip.id);
  const {data:bookings}=tripIds.length?await supabase.from("bookings").select("number_of_people,amount,platform_fee,payment_status,booking_status").in("trip_id",tripIds):{data:[]};
  const confirmed=(bookings??[]).filter(booking=>["confirmee","terminee"].includes(booking.booking_status));
  const participants=confirmed.reduce((sum,item)=>sum+item.number_of_people,0);
  const revenue=(bookings??[]).filter(item=>item.payment_status==="paye").reduce((sum,item)=>sum+Number(item.amount)-Number(item.platform_fee),0);
  const ratings=reviews??[];
  const rating=ratings.length?ratings.reduce((sum,item)=>sum+Number(item.rating),0)/ratings.length:0;
  return <section className="page-shell"><DashboardNav role="organizer"/><div className="page-header"><div><span className="eyebrow green">ORGANISATEUR</span><h1>Tableau de bord</h1></div><Link className="primary" href="/organisateur/sorties/nouvelle">Créer une sortie</Link></div><div className="admin-kpis"><div><span>Sorties actives</span><strong>{active??0}</strong></div><div><span>Participants confirmés</span><strong>{participants}</strong></div><div><span>Revenus nets cumulés</span><strong>{revenue.toFixed(2)} €</strong></div><div><span>Note moyenne</span><strong>{rating.toFixed(1)}/5</strong></div><div><span>Abonnés</span><strong>{followers??0}</strong></div></div><section className="panel-card"><h2>Vos prochaines sorties</h2>{!trips?.length?<p>Aucune sortie programmée.</p>:trips.map(trip=><div className="admin-row" key={trip.id}><span><Link className="text-link" href={`/sorties/${trip.id}`}>{trip.title}</Link><small>{new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(trip.date))} à {String(trip.start_time).slice(0,5)} · {trip.location} · {trip.status}</small></span><Link className="secondary" href={`/organisateur/sorties/${trip.id}`}>Gérer</Link></div>)}</section></section>;
}
