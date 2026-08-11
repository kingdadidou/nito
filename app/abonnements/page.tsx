import Link from "next/link";
import {redirect} from "next/navigation";
import {DashboardNav} from "@/components/dashboard-nav";
import {createClient} from "@/lib/supabase/server";
import {toggleOrganizerSubscription} from "./actions";

export const metadata={title:"Mes abonnements"};

export default async function Subscriptions({searchParams}:{searchParams:Promise<{abonnement?:string}>}){
  const q=await searchParams;const supabase=await createClient();if(!supabase)return null;
  const user=(await supabase.auth.getUser()).data.user;if(!user)redirect("/connexion");
  const profile=(await supabase.from("profiles").select("user_type").eq("id",user.id).single()).data;
  if(profile?.user_type!=="participant")redirect("/");
  const {data:subscriptions,error:subscriptionsError}=await supabase.from("organizer_subscriptions").select("organizer_id,created_at").eq("participant_id",user.id).order("created_at",{ascending:false});
  const ids=(subscriptions??[]).map(item=>item.organizer_id);
  const [{data:organizers,error:organizersError},{data:trips,error:tripsError}]=ids.length?await Promise.all([
    supabase.from("profiles").select("id,first_name,last_name,avatar_url,bio,city,average_rating").in("id",ids),
    supabase.from("trips").select("id,organizer_id,title,date,location").in("organizer_id",ids).eq("status","publiee").gte("date",new Date().toISOString().slice(0,10)).order("date").limit(20)
  ]):[{data:[],error:null},{data:[],error:null}];
  const organizerMap=new Map((organizers??[]).map(organizer=>[organizer.id,organizer]));
  const loadError=subscriptionsError||organizersError||tripsError;
  return <section className="page-shell"><DashboardNav role="participant"/><div className="page-header"><div><span className="eyebrow green">VOTRE COMMUNAUTÉ</span><h1>Organisateurs suivis</h1><p>Retrouvez leurs prochaines sorties et recevez une notification lors de chaque nouvelle publication.</p></div><Link className="primary" href="/explorer">Découvrir des sorties</Link></div>{q.abonnement==="retire"&&<p className="form-alert success">L’organisateur a été retiré de vos abonnements.</p>}{q.abonnement==="suivi"&&<p className="form-alert success">Vous suivez maintenant cet organisateur.</p>}{q.abonnement==="erreur"&&<p className="form-alert error">L’abonnement n’a pas pu être modifié.</p>}{loadError?<section className="panel-card"><p className="form-alert error">Impossible de charger vos abonnements pour le moment. Réessayez dans quelques instants.</p></section>:!subscriptions?.length?<section className="panel-card"><h2>Aucun abonnement</h2><p>Ouvrez une sortie et cliquez sur « Suivre cet organisateur ».</p></section>:<div className="admin-documents">{subscriptions.map(item=>{const organizer=organizerMap.get(item.organizer_id);const upcoming=(trips??[]).filter(trip=>trip.organizer_id===item.organizer_id);return <article className="panel-card" key={item.organizer_id}><div className="page-header"><div><h2>{organizer?.first_name} {organizer?.last_name}</h2><p>{organizer?.city??"Localisation non renseignée"} · ★ {Number(organizer?.average_rating??0).toFixed(1)}</p></div><form action={toggleOrganizerSubscription}><input type="hidden" name="organizer_id" value={item.organizer_id}/><button className="secondary" name="operation" value="ne_plus_suivre">Ne plus suivre</button></form></div>{organizer?.bio&&<p>{organizer.bio}</p>}<h3>Prochaines sorties</h3>{upcoming.length?upcoming.map(trip=><p key={trip.id}><Link className="text-link" href={`/sorties/${trip.id}`}>{trip.title}</Link> · {new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(trip.date))} · {trip.location}</p>):<p><small>Aucune sortie publiée à venir.</small></p>}</article>})}</div>}</section>;
}
