import Image from "next/image";
import Link from "next/link";

export type TripCardData={id:string;title:string;activity:string;location:string;date:string;price:number;host:string;rating:number;image:string;imageAlt?:string};

export function TripCard({trip}:{trip:TripCardData}){return <article className="trip-card"><div className="trip-image"><Image src={trip.image} alt={trip.imageAlt??trip.title} fill sizes="(max-width: 700px) 100vw, 33vw" unoptimized/><span className="price">{trip.price?`${trip.price.toFixed(2)} €`:"Gratuit"}</span></div><div className="trip-body"><span className="eyebrow green">{trip.activity}</span><h3><Link href={`/sorties/${trip.id}`}>{trip.title}</Link></h3><p className="trip-meta">{trip.location} · {new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(trip.date))}</p><div className="host-row"><span>{trip.host}</span><strong>★ {trip.rating.toFixed(1)}</strong></div></div></article>}
