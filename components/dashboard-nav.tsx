"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import type {Role} from "@/lib/types";

type DashboardRole = Role | "user" | "organizer" | "admin";
type NavLink = readonly [href: string, label: string];

function isCurrentPath(pathname: string, href: string) {
  if (pathname === href) return true;
  return !["/administration", "/organisateur"].includes(href) && pathname.startsWith(`${href}/`);
}

export function DashboardNav({role}: {role: DashboardRole}) {
  const pathname = usePathname();
  const normalized = role === "admin" ? "administrateur" : role === "organizer" ? "organisateur" : role === "user" ? "participant" : role;
  const common: NavLink[] = [["/profil", "Mon profil"], ["/calendrier", "Calendrier"], ["/messages", "Messagerie"], ["/notifications", "Notifications"]];
  const links: NavLink[] = normalized === "administrateur"
    ? [["/administration", "Vue d’ensemble"], ["/administration/sorties", "Sorties"], ["/administration/documents", "Justificatifs"], ["/administration/reservations", "Réservations"], ["/administration/finances", "Finances"], ["/administration/avis", "Avis"], ["/administration/signalements", "Signalements"], ["/administration/utilisateurs", "Utilisateurs"], ["/administration/emails", "E-mails"], ["/administration/procedures", "Procédures"], ["/administration/journal", "Journal"], ...common]
    : normalized === "organisateur"
      ? [["/organisateur", "Tableau de bord"], ["/organisateur/sorties/nouvelle", "Créer une sortie"], ["/organisateur/onboarding", "Mon dossier"], ...common]
      : [["/reservations", "Mes réservations"], ["/abonnements", "Mes abonnements"], ["/avis", "Mes avis"], ...common];

  return <nav className="dashboard-nav" aria-label="Navigation de l’espace personnel">
    {links.map(([href, label]) => {
      const active = isCurrentPath(pathname, href);
      return <Link key={href} href={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>{label}</Link>;
    })}
  </nav>;
}
