import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const supabase=await createClient();if(!supabase)return NextResponse.json({error:"Supabase non configuré"},{status:503});
  const user=(await supabase.auth.getUser()).data.user;if(!user)return NextResponse.json({error:"Non authentifié"},{status:401});
  const {id}=await params;const admin=createAdminClient();const {data}=await admin.from("message_attachments").select("storage_path,message:messages(sender_id,receiver_id)").eq("id",id).single();
  const message=Array.isArray(data?.message)?data.message[0]:data?.message;
  if(!data||!message||![message.sender_id,message.receiver_id].includes(user.id))return NextResponse.json({error:"Accès interdit"},{status:403});
  const {data:signed,error}=await admin.storage.from("message-attachments").createSignedUrl(data.storage_path,60,{download:true});
  if(error)return NextResponse.json({error:"Fichier indisponible"},{status:500});
  return NextResponse.redirect(signed.signedUrl);
}

