"use client";

import {Analytics} from "@vercel/analytics/next";

const privatePrefixes=["/administration","/organisateur","/profil","/reservations","/calendrier","/messages","/notifications","/avis","/abonnements","/auth","/api","/mot-de-passe","/compte-suspendu"];

export function PrivacyAnalytics(){
  return <Analytics beforeSend={event=>{
    const url=new URL(event.url);
    if(privatePrefixes.some(prefix=>url.pathname===prefix||url.pathname.startsWith(`${prefix}/`)))return null;
    url.pathname=url.pathname.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,"/[identifiant]");
    url.search="";
    return {...event,url:url.toString()};
  }}/>;
}
