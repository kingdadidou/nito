import {signOut} from "@/app/auth/actions";
export const metadata={title:"Compte suspendu"};
export default function SuspendedAccount(){return <section className="page-shell narrow"><div className="panel-card"><span className="eyebrow green">SÉCURITÉ NITO</span><h1>Compte temporairement suspendu</h1><p>Votre compte ne peut plus utiliser les fonctions privées de NITO. Consultez l’e-mail envoyé par l’équipe ou contactez le support pour demander un réexamen.</p><form action={signOut}><button className="primary">Se déconnecter</button></form></div></section>}
