import { DashboardNav } from "@/components/dashboard-nav";
import { trips } from "@/lib/data";
export const metadata = { title: "Calendrier" };
export default function Calendar() { return <section className="page-shell"><DashboardNav role="user"/><span className="eyebrow green">MON AGENDA</span><h1>Calendrier des sorties</h1><div className="calendar-list">{trips.map(t=><article className="panel-card" key={t.id}><time>{new Intl.DateTimeFormat("fr-FR", { day:"numeric", month:"long" }).format(new Date(t.date))}</time><div><h3>{t.title}</h3><p>{t.time} · {t.location}</p></div></article>)}</div></section> }
