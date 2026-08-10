import {DashboardNav} from "@/components/dashboard-nav";
import {createAdminClient} from "@/lib/supabase/admin";
import {sendDeliverabilityTest} from "./actions";

export const metadata={title:"Délivrabilité des e-mails"};
const mask=(email:string)=>{const [name,domain]=email.split("@");return `${name.slice(0,2)}***@${domain??""}`};

export default async function EmailOperations({searchParams}:{searchParams:Promise<{succes?:string;erreur?:string}>}){
  const q=await searchParams;
  const {data:deliveries}=await createAdminClient().from("email_deliveries").select("id,recipient_email,template,status,error_message,sent_at,created_at").order("created_at",{ascending:false}).limit(100);
  return <section className="page-shell"><DashboardNav role="administrateur"/><span className="eyebrow green">EXPLOITATION</span><h1>E-mails transactionnels</h1>
    {q.succes&&<p className="form-alert success">Le message de test a été accepté par Resend. Contrôlez maintenant sa réception réelle.</p>}{q.erreur&&<p className="form-alert error">Le message n’a pas pu être envoyé. Consultez le journal ci-dessous.</p>}
    <div className="admin-grid"><section className="panel-card"><h2>Test de délivrabilité</h2><p>Utilisez une véritable boîte de chaque fournisseur. Aucun mot de passe n’est nécessaire : seule l’adresse destinataire est transmise à Resend.</p><form className="big-form" action={sendDeliverabilityTest}><label>Fournisseur<select name="provider" required><option value="gmail">Gmail</option><option value="outlook">Outlook / Hotmail</option><option value="orange">Orange</option><option value="ovh">OVH</option></select></label><label>Adresse de test<input name="email" type="email" required/></label><button className="primary">Envoyer le test</button></form></section>
    <section className="panel-card"><h2>Contrôle manuel</h2><ol><li>Vérifier la boîte principale sous 10 minutes.</li><li>Vérifier le dossier indésirable.</li><li>Contrôler que l’expéditeur est NITO et que les liens pointent vers nito-nature.fr.</li><li>Répondre au message pour vérifier support@nito-nature.fr.</li><li>Consigner tout échec avant un nouvel envoi.</li></ol></section></div>
    <section className="panel-card"><h2>100 derniers envois</h2>{!deliveries?.length?<p>Aucun envoi journalisé.</p>:deliveries.map(item=><p key={item.id}><b>{item.status}</b> · {item.template} · {mask(item.recipient_email)} · {new Intl.DateTimeFormat("fr-FR",{dateStyle:"short",timeStyle:"short"}).format(new Date(item.created_at))}{item.error_message&&<><br/><small>{item.error_message}</small></>}</p>)}</section>
  </section>;
}
