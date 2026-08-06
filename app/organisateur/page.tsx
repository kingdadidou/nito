import Link from "next/link";
import {redirect} from "next/navigation";
import {DashboardNav} from "@/components/dashboard-nav";
import {createClient} from "@/lib/supabase/server";

export const metadata={title:"Espace organisateur"};

export default async function Organizer(){
  const supabase=await createClient();if(!supabase)return null;
  const user=(await supabase.auth.getUser()).data.user;if(!user)redirect("/connexion");
  const [{count:active},{count:followers},{data:trips}]=await Promise.all([
    supabase.from("trips").select("id",{count:"exact",head:true}).eq("organizer_id",user.id).eq("status","publiee"),
    supabase.from("organizer_subscriptions").select("participant_id",{count:"exact",head:true}).eq("organizer_id",user.id),
    supabase.from("trips").select("id,title,date,location,status").eq("organizer_id",user.id).gte("date",new Date().toISOString().slice(0,10)).order("date").limit(5),
  ]);
  return <section className="page-shell"><DashboardNav role="organizer"/><div className="page-header"><div><span className="eyebrow green">ORGANISATEUR</span><h1>Tableau de bord</h1></div><Link className="primary" href="/organisateur/sorties/nouvelle">Créer une sortie</Link></div><div className="admin-kpis"><div><span>Sorties actives</span><strong>{active??0}</strong></div><div><span>Abonnés</span><strong>{followers??0}</strong></div><div><span>Prochaines sorties</span><strong>{trips?.length??0}</strong></div></div><section className="panel-card"><h2>Vos prochaines sorties</h2>{!trips?.length?<p>Aucune sortie programmée.</p>:trips.map(trip=><p key={trip.id}><Link className="text-link" href={`/sorties/${trip.id}`}>{trip.title}</Link> · {new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(trip.date))} · {trip.location} · {trip.status}</p>)}</section></section>;
}
