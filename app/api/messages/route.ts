import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validAttachment, validMessage } from "@/lib/domain/rules";

export async function POST(request:Request){
  const supabase=await createClient();if(!supabase)return NextResponse.json({error:"Supabase non configuré"},{status:503});
  const user=(await supabase.auth.getUser()).data.user;if(!user)return NextResponse.json({error:"Non authentifié"},{status:401});
  const form=await request.formData();const receiverId=String(form.get("receiver_id")??"");const tripId=String(form.get("trip_id")??"")||null;const content=String(form.get("content")??"").trim();const file=form.get("file");
  if(!validMessage(receiverId,content))return NextResponse.json({error:"Message invalide"},{status:400});
  if(file instanceof File&&file.size>0&&!validAttachment(file))return NextResponse.json({error:"Pièce jointe invalide"},{status:400});
  const {data:message,error}=await supabase.from("messages").insert({sender_id:user.id,receiver_id:receiverId,trip_id:tripId,content}).select("id,sender_id,receiver_id,trip_id,content,read_at,created_at").single();
  if(error)return NextResponse.json({error:error.message.includes("row-level security")?"Message interdit : utilisateur bloqué ou coordonnées non autorisées avant réservation.":error.message},{status:403});
  let attachment=null;
  if(file instanceof File&&file.size>0){
    const ext=file.type==="application/pdf"?"pdf":file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp";const path=`${user.id}/${message.id}/${crypto.randomUUID()}.${ext}`;const admin=createAdminClient();
    const {error:uploadError}=await admin.storage.from("message-attachments").upload(path,new Uint8Array(await file.arrayBuffer()),{contentType:file.type});if(uploadError)return NextResponse.json({error:"Message envoyé, mais pièce jointe refusée"},{status:500});
    const {data}=await admin.from("message_attachments").insert({message_id:message.id,storage_path:path,original_name:file.name,mime_type:file.type,size_bytes:file.size}).select("id,original_name,mime_type").single();attachment=data;
  }
  return NextResponse.json({...message,attachment});
}

export async function PATCH(request:Request){
  const supabase=await createClient();if(!supabase)return NextResponse.json({error:"Supabase non configuré"},{status:503});
  const user=(await supabase.auth.getUser()).data.user;if(!user)return NextResponse.json({error:"Non authentifié"},{status:401});
  const {sender_id}=await request.json();const {error}=await supabase.from("messages").update({read_at:new Date().toISOString()}).eq("sender_id",sender_id).eq("receiver_id",user.id).is("read_at",null);
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true});
}
