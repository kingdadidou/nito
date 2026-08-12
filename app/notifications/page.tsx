import Link from "next/link";
import {redirect} from "next/navigation";
import {DashboardNav} from "@/components/dashboard-nav";
import {createClient} from "@/lib/supabase/server";
import {notificationHref} from "@/lib/domain/rules";
import {markNotificationsRead} from "./actions";

export const metadata={title:"Notifications"};
export default async function Notifications(){
  const supabase=await createClient();if(!supabase)return null;const user=(await supabase.auth.getUser()).data.user;if(!user)redirect("/connexion");
  const profile=(await supabase.from("profiles").select("user_type").eq("id",user.id).single()).data;
  const {data:notifications}=await supabase.from("notifications").select("id,type,title,content,data,read_at,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50);
  const unread=(notifications??[]).filter(item=>!item.read_at).length;
  return <section className="page-shell"><DashboardNav role={profile?.user_type??"participant"}/><div className="page-header"><div><span className="eyebrow green">ACTUALITÉS</span><h1>Notifications</h1><p>{unread?`${unread} notification(s) non lue(s)`:"Vous êtes à jour."}</p></div>{unread>0&&<form action={markNotificationsRead}><button className="secondary">Tout marquer comme lu</button></form>}</div><section className="panel-card">{!notifications?.length?<p>Aucune notification.</p>:notifications.map(item=><div className={`notification-row ${item.read_at?"":"notification-unread"}`} key={item.id}><div><b>{item.title}</b><p>{item.content}</p><small>{new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(item.created_at))}</small></div><Link className="secondary" href={notificationHref(item.type,item.data)}>Ouvrir</Link></div>)}</section></section>;
}
