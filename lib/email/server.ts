import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";

type EmailInput={eventKey:string;to:string;userId?:string|null;template:string;subject:string;heading:string;content:string;actionLabel?:string;actionUrl?:string};
const siteUrl=process.env.NEXT_PUBLIC_SITE_URL??"https://www.nito-nature.fr";
const escapeHtml=(value:string)=>value.replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]!));

export async function sendTransactionalEmail(input:EmailInput){
  const admin=createAdminClient();
  const {data:claim,error:claimError}=await admin.from("email_deliveries").insert({event_key:input.eventKey,recipient_user_id:input.userId??null,recipient_email:input.to,template:input.template}).select("id").single();
  if(claimError?.code==="23505")return {sent:false,duplicate:true};
  if(claimError||!claim)return {sent:false,error:"journal_indisponible"};
  const apiKey=process.env.RESEND_API_KEY;const from=process.env.TRANSACTIONAL_EMAIL_FROM;
  if(!apiKey||!from){await admin.from("email_deliveries").update({status:"ignore",error_message:"Configuration e-mail absente"}).eq("id",claim.id);return {sent:false,error:"configuration_absente"};}
  const action=input.actionLabel&&input.actionUrl?`<p style="margin:28px 0"><a href="${escapeHtml(input.actionUrl)}" style="background:#1f5a43;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">${escapeHtml(input.actionLabel)}</a></p>`:"";
  const html=`<!doctype html><html lang="fr"><body style="margin:0;background:#f3f6f1;font-family:Arial,sans-serif;color:#1f2822"><div style="max-width:620px;margin:30px auto;background:#fff;border-radius:14px;padding:32px"><p style="color:#1f5a43;font-weight:800;letter-spacing:2px">NITO</p><h1 style="font-size:28px">${escapeHtml(input.heading)}</h1><div style="line-height:1.65">${escapeHtml(input.content).replace(/\n/g,"<br>")}</div>${action}<hr style="border:0;border-top:1px solid #dfe5df;margin:28px 0"><small>Message automatique envoyé par NITO · <a href="${siteUrl}">nito-nature.fr</a></small></div></body></html>`;
  try{const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[input.to],subject:input.subject,html})});const result=await response.json() as {id?:string;message?:string};if(!response.ok)throw new Error(result.message??`HTTP ${response.status}`);await admin.from("email_deliveries").update({status:"envoye",provider_message_id:result.id??null,sent_at:new Date().toISOString()}).eq("id",claim.id);return {sent:true};}catch(error){await admin.from("email_deliveries").update({status:"echoue",error_message:error instanceof Error?error.message.slice(0,500):"Erreur inconnue"}).eq("id",claim.id);console.error("Transactional email",input.template,error);return {sent:false,error:"envoi_echoue"};}
}

export async function getBookingEmailContext(bookingId:string){const admin=createAdminClient();const {data}=await admin.from("bookings").select("id,amount,number_of_people,participant_id,participant:profiles!bookings_participant_id_fkey(email,first_name),trip:trips(id,title,date,start_time,organizer_id,organizer:profiles!trips_organizer_id_fkey(email,first_name))").eq("id",bookingId).single();if(!data)return null;const participant=Array.isArray(data.participant)?data.participant[0]:data.participant;const trip=Array.isArray(data.trip)?data.trip[0]:data.trip;const organizer=trip?(Array.isArray(trip.organizer)?trip.organizer[0]:trip.organizer):null;return {...data,participant,trip,organizer};}
