import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const imageTypes=new Set(["image/jpeg","image/png","image/webp"]);
const documentTypes=new Set(["application/pdf","image/jpeg","image/png"]);
const extensions:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf"};

export async function POST(request:Request){
  const supabase=await createClient();if(!supabase)return NextResponse.json({error:"Supabase non configuré"},{status:503});
  const user=(await supabase.auth.getUser()).data.user;if(!user)return NextResponse.redirect(new URL("/connexion",request.url),303);
  const form=await request.formData();const file=form.get("file");const bucket=String(form.get("bucket")??"");const redirectTo=String(form.get("redirect")??"/profil");
  if(!(file instanceof File)||file.size===0)return NextResponse.redirect(new URL(`${redirectTo}?upload=vide`,request.url),303);
  const allowed=bucket==="avatars"?imageTypes:documentTypes;
  if(!allowed.has(file.type)||file.size>(bucket==="avatars"?5_242_880:10_485_760))return NextResponse.redirect(new URL(`${redirectTo}?upload=invalide`,request.url),303);
  if(!["avatars","insurance-documents","professional-documents"].includes(bucket))return NextResponse.json({error:"Bucket interdit"},{status:403});
  if(bucket!=="avatars"){
    const {data:profile}=await supabase.from("profiles").select("user_type").eq("id",user.id).single();
    if(!profile||!(["organisateur","administrateur"] as string[]).includes(profile.user_type))return NextResponse.json({error:"Accès interdit"},{status:403});
  }
  const admin=createAdminClient();const path=`${user.id}/${crypto.randomUUID()}.${extensions[file.type]}`;
  const {error}=await admin.storage.from(bucket).upload(path,new Uint8Array(await file.arrayBuffer()),{contentType:file.type,upsert:false});
  if(error)return NextResponse.redirect(new URL(`${redirectTo}?upload=erreur`,request.url),303);
  if(bucket==="avatars"){
    const publicUrl=admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    await admin.from("profiles").update({avatar_url:publicUrl}).eq("id",user.id);
  }else{
    const requestedType=String(form.get("document_type")??"");
    const allowedDocumentTypes=new Set(["assurance_rc_pro","diplome","carte_professionnelle","affiliation_structure"]);
    const documentType=allowedDocumentTypes.has(requestedType)?requestedType:(bucket==="insurance-documents"?"assurance_rc_pro":"diplome");
    await admin.from("organizer_documents").insert({organizer_id:user.id,document_type:documentType,storage_path:`${bucket}/${path}`,status:"en_attente"});
  }
  return NextResponse.redirect(new URL(`${redirectTo}?upload=ok`,request.url),303);
}
