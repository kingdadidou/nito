import Link from "next/link";
import {redirect} from "next/navigation";
import {DashboardNav} from "@/components/dashboard-nav";
import {createClient} from "@/lib/supabase/server";

export const metadata={title:"Calendrier"};

export default async function Calendar({searchParams}:{searchParams:Promise<{reservation?:string}>}){
  const q=await searchParams;const supabase=await createClient();if(!supabase)return null;const user=(await supabase.auth.getUser()).data.user;if(!user)redirect("/connexion");const profile=(await supabase.from("profiles").select("user_type").eq("id",user.id).single()).data;if(!profile)redirect("/connexion");
  let entries:{id:string;title:string;date:string;start_time:string;location:string;context:string}[]=[];
  if(profile.user_type==="participant"){
    const {data}=await supabase.from("bookings").select("booking_status,trip:trips(id,title,date,start_time,location)").eq("participant_id",user.id).in("booking_status",["confirmee","terminee"]).order("created_at",{ascending:false});
    entries=(data??[]).flatMap(item=>{const trip=Array.isArray(item.trip)?item.trip[0]:item.trip;return trip?[{...trip,context:item.booking_status==="terminee"?"Terminée":"Réservation confirmée"}]:[];}).sort((a,b)=>a.date.localeCompare(b.date));
  }else{
    const query=supabase.from("trips").select("id,title,date,start_time,location,status").gte("date",new Date().toISOString().slice(0,10)).order("date");const {data}=profile.user_type==="administrateur"?await query:await query.eq("organizer_id",user.id);entries=(data??[]).map(trip=>({...trip,context:trip.status}));
  }
  return <section className="page-shell"><DashboardNav role={profile.user_type}/>{q.reservation==="confirmee"&&<p className="form-alert success">Votre réservation est confirmée.</p>}<span className="eyebrow green">MON AGENDA</span><h1>Calendrier des sorties</h1>{entries.length?<div className="calendar-list">{entries.map(entry=><article className="panel-card" key={entry.id}><time>{new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"long"}).format(new Date(entry.date))}</time><div><h3><Link href={`/sorties/${entry.id}`}>{entry.title}</Link></h3><p>{String(entry.start_time).slice(0,5)} · {entry.location} · {entry.context}</p></div></article>)}</div>:<div className="empty-state"><h2>Aucune sortie dans votre calendrier</h2><p>{profile.user_type==="participant"?"Vos réservations confirmées apparaîtront ici.":"Vos prochaines sorties apparaîtront ici."}</p>{profile.user_type==="participant"&&<Link className="primary" href="/explorer">Explorer les sorties</Link>}</div>}</section>;
}
