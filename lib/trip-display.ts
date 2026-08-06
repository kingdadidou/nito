import type {TripCardData} from "@/components/trip-card";

export const defaultTripImage="https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80";

type Related<T>=T|T[]|null;
type TripRow={id:string;title:string;location:string;date:string;price:number|string;activity:Related<{name:string}>;organizer:Related<{first_name:string;last_name:string;average_rating:number|string}>;images?:{public_url:string;alt_text:string|null;position:number}[]|null};

export function toTripCard(row:TripRow):TripCardData{
  const activity=Array.isArray(row.activity)?row.activity[0]:row.activity;
  const organizer=Array.isArray(row.organizer)?row.organizer[0]:row.organizer;
  const image=[...(row.images??[])].sort((a,b)=>a.position-b.position)[0];
  return {id:row.id,title:row.title,location:row.location,date:row.date,price:Number(row.price),activity:activity?.name??"Sortie nature",host:`${organizer?.first_name??""} ${organizer?.last_name??""}`.trim()||"Organisateur NITO",rating:Number(organizer?.average_rating??0),image:image?.public_url??defaultTripImage,imageAlt:image?.alt_text??row.title};
}
