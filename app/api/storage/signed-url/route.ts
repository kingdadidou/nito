import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request:Request){
  const supabase=await createClient();if(!supabase)return NextResponse.json({error:"Supabase non configuré"},{status:503});
  const user=(await supabase.auth.getUser()).data.user;if(!user)return NextResponse.json({error:"Non authentifié"},{status:401});
  const id=new URL(request.url).searchParams.get("document");if(!id)return NextResponse.json({error:"Document manquant"},{status:400});
  const admin=createAdminClient();const {data:document}=await admin.from("organizer_documents").select("organizer_id,storage_path").eq("id",id).single();
  const {data:profile}=await admin.from("profiles").select("user_type").eq("id",user.id).single();
  if(!document||(document.organizer_id!==user.id&&profile?.user_type!=="administrateur"))return NextResponse.json({error:"Accès interdit"},{status:403});
  const slash=document.storage_path.indexOf("/");const bucket=document.storage_path.slice(0,slash),path=document.storage_path.slice(slash+1);
  if(!["insurance-documents","professional-documents","organizer-documents"].includes(bucket))return NextResponse.json({error:"Chemin invalide"},{status:400});
  const {data,error}=await admin.storage.from(bucket).createSignedUrl(path,60);
  if(error)return NextResponse.json({error:"Lien indisponible"},{status:500});
  return NextResponse.redirect(data.signedUrl);
}
