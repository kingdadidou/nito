import Image from "next/image";
import Link from "next/link";
import type { Trip } from "@/lib/types";
export function TripCard({ trip }: { trip: Trip }) { return <article className="trip-card"><div className="trip-image"><Image src={trip.image} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" /><span className="price">{trip.price ? `${trip.price} €` : "Gratuit"}</span></div><div className="trip-body"><span className="eyebrow green">{trip.activity}</span><h3><Link href={`/sorties/${trip.id}`}>{trip.title}</Link></h3><p className="trip-meta">{trip.location} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(trip.date))}</p><div className="host-row"><span>{trip.host}</span><strong>★ {trip.rating}</strong></div></div></article> }
