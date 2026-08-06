import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return <footer>
    <div><Link className="brand footer-brand" href="/" aria-label="NITO — Accueil"><Image className="brand-logo" src="/nito-logo.png" alt="" width={50} height={50}/><span>NITO</span></Link><p>Des expériences nature, humaines et accessibles.</p></div>
    <div><b>Découvrir</b><Link href="/explorer">Les sorties</Link><Link href="/a-propos">Qui sommes-nous ?</Link><Link href="/inscription?role=organisateur">Devenir organisateur</Link><Link href="/transparence">Classement et commissions</Link></div>
    <div><b>Aide et sécurité</b><Link href="/aide">Centre d’aide</Link><Link href="/securite-sportive">Encadrement sportif</Link><Link href="/annulations">Annulations</Link><Link href="/signalement-litiges">Signalements et litiges</Link><Link href="/contact">Contact</Link></div>
    <div><b>Informations légales</b><Link href="/mentions-legales">Mentions légales</Link><Link href="/conditions">CGU et réservation</Link><Link href="/confidentialite">Confidentialité</Link><Link href="/cookies">Cookies</Link></div>
  </footer>;
}
