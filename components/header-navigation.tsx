"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import type {Role} from "@/lib/types";

export function HeaderNavigation({authenticated, role}: {authenticated: boolean; role?: Role}) {
  const pathname = usePathname();
  const links = [
    {href: "/explorer", label: "Explorer"},
    {href: "/a-propos", label: "Qui sommes-nous ?"},
    ...(authenticated ? [{href: "/messages", label: "Messages"}, {href: "/calendrier", label: "Calendrier"}] : []),
    ...(role === "organisateur" ? [{href: "/organisateur/sorties/nouvelle", label: "Proposer une sortie"}] : []),
    ...(role === "administrateur" ? [{href: "/administration", label: "Administration"}] : []),
  ];
  const navigation = links.map(({href, label}) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return <Link key={href} href={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>{label}</Link>;
  });
  return <>
    <nav className="main-nav" aria-label="Navigation principale">{navigation}</nav>
    <details className="mobile-menu">
      <summary aria-label="Ouvrir le menu"><span aria-hidden="true">☰</span><span>Menu</span></summary>
      <nav aria-label="Navigation mobile">{navigation}</nav>
    </details>
  </>;
}
