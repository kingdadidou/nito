import Link from "next/link";
import {DashboardNav} from "@/components/dashboard-nav";
import {createAdminClient} from "@/lib/supabase/admin";

export const metadata={title:"Procédures d’exploitation"};

export default async function Procedures(){
  const admin=createAdminClient();
  const today=new Date().toISOString().slice(0,10);
  const [{count:openReports},{count:pendingTrips},{count:pendingDocuments},{data:activities},{data:trips}]=await Promise.all([
    admin.from("reports").select("id",{count:"exact",head:true}).in("status",["ouvert","en_cours"]),
    admin.from("trips").select("id",{count:"exact",head:true}).eq("status","en_attente"),
    admin.from("organizer_documents").select("id",{count:"exact",head:true}).eq("status","en_attente"),
    admin.from("activities").select("id,name").order("name"),
    admin.from("trips").select("activity_id,status,date").eq("status","publiee").gte("date",today),
  ]);
  const activityCounts=new Map<string,number>();for(const trip of trips??[])activityCounts.set(trip.activity_id,(activityCounts.get(trip.activity_id)??0)+1);
  return <section className="page-shell"><DashboardNav role="administrateur"/><span className="eyebrow green">EXPLOITATION</span><h1>Procédures quotidiennes</h1>
    <div className="admin-kpis"><div><span>Signalements ouverts</span><strong>{openReports??0}</strong></div><div><span>Sorties à modérer</span><strong>{pendingTrips??0}</strong></div><div><span>Documents à vérifier</span><strong>{pendingDocuments??0}</strong></div><div><span>Sorties publiées à venir</span><strong>{trips?.length??0}</strong></div></div>
    <div className="admin-grid"><section className="panel-card"><h2>Support — chaque jour ouvré</h2><ol><li>Lire support@nito-nature.fr matin et après-midi.</li><li>Accuser réception sous un jour ouvré.</li><li>Classer : compte, réservation, paiement, sécurité ou données personnelles.</li><li>Ne jamais demander un mot de passe, une carte bancaire ou une pièce d’identité par e-mail.</li><li>Clore seulement après réponse et journalisation de la solution.</li></ol><Link className="secondary" href="/administration/reservations">Ouvrir les réservations</Link></section>
    <section className="panel-card"><h2>Modération</h2><ol><li>Prioriser danger, harcèlement, fraude et activité sportive non qualifiée.</li><li>Conserver le signalement et les éléments utiles sans diffusion inutile.</li><li>Masquer temporairement si le risque est sérieux.</li><li>Recueillir les observations des parties.</li><li>Décider de façon motivée puis permettre la contestation.</li></ol><Link className="secondary" href="/administration/signalements">Ouvrir les signalements</Link></section>
    <section className="panel-card"><h2>Litige ou paiement</h2><ol><li>Identifier réservation, PaymentIntent et chronologie.</li><li>Vérifier les CGU et la politique d’annulation applicables.</li><li>Geler toute action irréversible en cas de doute.</li><li>Répondre au litige Stripe avant l’échéance avec les preuves strictement nécessaires.</li><li>Tracer remboursement, décision et communication aux parties.</li></ol><Link className="secondary" href="/administration/finances">Ouvrir les finances</Link></section>
    <section className="panel-card"><h2>Urgence</h2><ol><li>En cas de danger immédiat, inviter à appeler le 112, le 15, le 17 ou le 18 selon la situation.</li><li>Ne pas se présenter comme service de secours.</li><li>Suspendre l’annonce ou le compte si cela réduit un risque actuel.</li><li>Préserver les données pertinentes et limiter leur accès.</li><li>Documenter heure, décision, auteur et justification.</li></ol></section></div>
    <section className="panel-card"><h2>Couverture du catalogue</h2><p>Objectif de lancement recommandé : au moins trois sorties réelles à venir par activité et plusieurs organisateurs vérifiés. Les annonces doivent provenir d’organisateurs réels ; elles ne doivent jamais être inventées.</p>{(activities??[]).map(activity=>{const count=activityCounts.get(activity.id)??0;return <p key={activity.id}><b>{activity.name}</b> : {count} sortie{count!==1&&"s"} à venir · {Math.max(0,3-count)} encore recommandée{Math.max(0,3-count)!==1&&"s"}</p>})}<Link className="primary" href="/administration/sorties">Contrôler les sorties</Link></section>
  </section>;
}
