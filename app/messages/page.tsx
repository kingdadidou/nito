import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { MessagingClient,ChatMessage,ChatProfile } from "@/components/messaging-client";
import { createClient } from "@/lib/supabase/server";

export const metadata={title:"Messagerie"};
export default async function Messages({searchParams}:{searchParams:Promise<{with?:string;trip?:string}>}){
  const q=await searchParams;const supabase=await createClient();if(!supabase)redirect("/connexion");const user=(await supabase.auth.getUser()).data.user;if(!user)redirect("/connexion");
  const {data:raw}=await supabase.from("messages").select("id,sender_id,receiver_id,trip_id,content,read_at,created_at,message_attachments(id,original_name,mime_type)").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order("created_at",{ascending:true}).limit(500);
  const messages=(raw??[]).map(m=>({...m,attachment:m.message_attachments?.[0]??null})) as ChatMessage[];
  const ids=Array.from(new Set(messages.flatMap(m=>[m.sender_id,m.receiver_id]).concat(q.with?[q.with]:[]))).filter(id=>id!==user.id);
  const {data:profiles}=ids.length?await supabase.from("profiles").select("id,first_name,last_name,avatar_url").in("id",ids):{data:[]};
  return <section className="page-shell"><DashboardNav role="user"/><MessagingClient userId={user.id} initialMessages={messages} profiles={(profiles??[]) as ChatProfile[]} initialPeer={q.with} initialTrip={q.trip}/></section>;
}
