import Link from "next/link";
import {DashboardNav} from "@/components/dashboard-nav";
import {createAdminClient} from "@/lib/supabase/admin";
import {reviewOrganizerDocument} from "./actions";

export const metadata={title:"Justificatifs organisateurs"};

const typeLabels:Record<string,string>={
  assurance_rc_pro:"Assurance RC professionnelle",
  assurance:"Assurance",
  diplome:"Diplôme ou titre professionnel",
  carte_professionnelle:"Carte professionnelle",
  affiliation_structure:"Affiliation à une structure",
  professionnel:"Document professionnel",
};
const levelLabels:Record<string,string>={passionne_verifie:"Passionné vérifié",association:"Association",professionnel_diplome:"Professionnel diplômé",guide_educateur_sportif:"Guide ou éducateur sportif"};

export default async function OrganizerDocuments({searchParams}:{searchParams:Promise<{succes?:string;erreur?:string}>}){
  const q=await searchParams;
  const admin=createAdminClient();
  const {data:documents}=await admin.from("organizer_documents").select("id,organizer_id,document_type,status,storage_path,created_at,reviewed_at").order("created_at",{ascending:false}).limit(100);
  const organizerIds=[...new Set((documents??[]).map(document=>document.organizer_id))];
  const [{data:profiles},{data:organizers}]=organizerIds.length?await Promise.all([
    admin.from("profiles").select("id,first_name,last_name,email").in("id",organizerIds),
    admin.from("organizer_profiles").select("organizer_id,organizer_level,affiliation_name,qualification_verified,insurance_verified").in("organizer_id",organizerIds),
  ]):[{data:[]},{data:[]}];
  const profileById=new Map((profiles??[]).map(profile=>[profile.id,profile]));
  const organizerById=new Map((organizers??[]).map(profile=>[profile.organizer_id,profile]));

  return <section className="page-shell"><DashboardNav role="administrateur"/><div className="page-header"><div><span className="eyebrow green">ADMINISTRATION</span><h1>Justificatifs organisateurs</h1><p>Consultez les fichiers privés et vérifiez chaque document avant d’autoriser un encadrement sportif rémunéré.</p></div><Link className="secondary" href="/administration">Retour au tableau de bord</Link></div>
  {q.succes&&<p className="form-alert success">Le document a été {q.succes==="verifie"?"validé":"rejeté"} et les indicateurs de l’organisateur ont été recalculés.</p>}{q.erreur&&<p className="form-alert error">La décision n’a pas pu être enregistrée.</p>}
  {!documents?.length?<section className="panel-card"><p>Aucun justificatif transmis.</p></section>:<div className="admin-documents">{documents.map(document=>{const profile=profileById.get(document.organizer_id);const organizer=organizerById.get(document.organizer_id);return <article className="panel-card" key={document.id}><div className="page-header"><div><h2>{typeLabels[document.document_type]??document.document_type}</h2><p><strong>{profile?.first_name} {profile?.last_name}</strong>{profile?.email&&<> · {profile.email}</>}</p><p>{levelLabels[organizer?.organizer_level??""]??"Niveau non renseigné"}{organizer?.affiliation_name&&<> · {organizer.affiliation_name}</>}</p></div><span className={`document-status status-${document.status}`}>{document.status==="verifie"?"Vérifié":document.status==="rejete"?"Rejeté":"À contrôler"}</span></div><p><small>Transmis le {new Intl.DateTimeFormat("fr-FR",{dateStyle:"long",timeStyle:"short"}).format(new Date(document.created_at))}</small></p><div className="document-review-actions"><Link className="secondary" href={`/api/storage/signed-url?document=${document.id}`} target="_blank" rel="noreferrer">Consulter le fichier</Link><form action={reviewOrganizerDocument}><input type="hidden" name="document_id" value={document.id}/><button className="primary" name="decision" value="verifie">Valider</button><button className="link-button danger" name="decision" value="rejete">Rejeter</button></form></div><div className="verification-summary"><span>{organizer?.qualification_verified?"✓":"○"} Qualification vérifiée</span><span>{organizer?.insurance_verified?"✓":"○"} Assurance vérifiée</span></div></article>})}</div>}
  </section>;
}
