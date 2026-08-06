import {TripCard} from "@/components/trip-card";
import {PublicMap} from "@/components/public-map";
import {createClient} from "@/lib/supabase/server";
import {toTripCard} from "@/lib/trip-display";

export const metadata={title:"Explorer"};

export default async function Explore({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const q=await searchParams;const supabase=await createClient();
  const activities=supabase?((await supabase.from("activities").select("id,name").order("name")).data??[]):[];
  const selectedActivity=activities.find(activity=>activity.name===q.activite);
  let query=supabase?.from("trips").select("id,title,location,date,price,approximate_latitude,approximate_longitude,activity:activities(name),organizer:profiles(first_name,last_name,average_rating),images:trip_images(public_url,alt_text,position)").eq("status","publiee").gte("date",new Date().toISOString().slice(0,10)).order("date");
  if(q.lieu)query=query?.ilike("location",`%${q.lieu}%`);if(q.date)query=query?.eq("date",q.date);if(selectedActivity)query=query?.eq("activity_id",selectedActivity.id);if(q.activite&&!selectedActivity)query=undefined;
  const rows=query?(await query).data??[]:[];const trips=rows.map(row=>toTripCard(row));const points=rows.filter(row=>row.approximate_latitude!=null&&row.approximate_longitude!=null).map(row=>({lat:Number(row.approximate_latitude),lng:Number(row.approximate_longitude),label:`${row.title} · ${row.location}`,href:`/sorties/${row.id}`}));
  return <section className="page-shell"><div className="page-header"><div><span className="eyebrow green">EXPLORER</span><h1>Trouvez votre prochaine sortie</h1></div></div><form className="filters"><input name="lieu" defaultValue={q.lieu} placeholder="Lieu ou mot-clé"/><select name="activite" defaultValue={q.activite}><option value="">Toutes les activités</option>{activities.map(activity=><option key={activity.id} value={activity.name}>{activity.name}</option>)}</select><input name="date" defaultValue={q.date} type="date"/><button className="primary">Filtrer</button></form><PublicMap points={points}/><p className="results-meta">{trips.length} sortie{trips.length!==1&&"s"}</p>{trips.length?<div className="card-grid">{trips.map(trip=><TripCard key={trip.id} trip={trip}/>)}</div>:<div className="empty-state"><h2>Aucune sortie trouvée</h2><p>Essayez d’élargir les critères ou revenez prochainement.</p></div>}</section>;
}
