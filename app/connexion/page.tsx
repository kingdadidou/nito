import Link from "next/link";
import { sendMagicLink, signIn, signInWithGoogle } from "./actions";
export const metadata = { title: "Connexion" };
export default async function Login({ searchParams }: { searchParams: Promise<{ erreur?: string; confirmation?: string }> }) {
  const q = await searchParams;
  return <section className="page-shell auth-shell"><div className="form-intro"><span className="eyebrow green">VOTRE ESPACE</span><h1>Connexion</h1><p>Retrouvez vos réservations, messages et sorties.</p></div>
    <form className="big-form auth-form" action={signIn}>{q.erreur && <p className="form-alert error" role="alert">Impossible de vous connecter. Vérifiez vos informations ou la configuration du fournisseur.</p>}{q.confirmation && <p className="form-alert success">Votre demande a bien été prise en compte. Consultez votre boîte e-mail si nécessaire.</p>}<label>Adresse e-mail<input name="email" type="email" autoComplete="email" required/></label><label>Mot de passe<input name="password" type="password" autoComplete="current-password" required/></label><button className="primary wide">Se connecter</button><button className="secondary wide" formAction={sendMagicLink}>Recevoir un lien de connexion</button><button className="google-button wide" formAction={signInWithGoogle} formNoValidate>Continuer avec Google</button><div className="auth-links"><Link href="/mot-de-passe/oublie">Mot de passe oublié ?</Link><Link href="/inscription">Créer un compte</Link></div></form>
  </section>;
}
