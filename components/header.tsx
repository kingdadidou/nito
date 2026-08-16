import Image from "next/image";
import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {signOut} from "@/app/auth/actions";
import type {Role} from "@/lib/types";
import {HeaderNavigation} from "@/components/header-navigation";

export async function Header() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const profile = user && supabase ? (await supabase.from("profiles").select("first_name,user_type").eq("id", user.id).single()).data : null;
  const role = profile?.user_type as Role | undefined;
  const accountHref = role === "administrateur" ? "/administration" : role === "organisateur" ? "/organisateur" : "/espace";
  return <header className="topbar">
    <Link className="brand" href="/" aria-label="NITO — Accueil"><Image className="brand-logo" src="/nito-logo.png" alt="Logo NITO" width={44} height={44} priority /><span>NITO</span></Link>
    <HeaderNavigation authenticated={Boolean(user)} role={role} />
    {user ? <div className="account-actions">
      <Link className="profile-chip" href={accountHref} aria-label={`Accéder à mon espace${profile?.first_name ? `, ${profile.first_name}` : ""}`}><span className="avatar">{profile?.first_name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "?"}</span><span className="profile-name">{profile?.first_name || "Mon espace"}</span></Link>
      <form action={signOut}><button className="logout-button" type="submit">Déconnexion</button></form>
    </div> : <div className="account-actions guest-actions"><Link href="/connexion">Connexion</Link><Link className="primary" href="/inscription">Inscription</Link></div>}
  </header>;
}
