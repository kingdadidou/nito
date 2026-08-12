import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";

const types=new Set(["image/jpeg","image/png","image/webp"]);
const uuid=/^[0-9a-f-]{36}$/i;

async function ownedTrip(tripId:string){
  const supabase=await createClient();const user=supabase?(await supabase.auth.getUser()).data.user:null;if(!user)return null;
  const {data:trip}=await supabase!.from("trips").select("id,title").eq("id",tripId).eq("organizer_id",user.id).single();
  return trip?{user,trip}:null;
}

export async function POST(request:Request){
  const form=await request.formData();const tripId=String(form.get("trip_id")??"");const file=form.get("image");const alt=String(form.get("alt_text")??"").trim();
  if(!uuid.test(tripId)||!(file instanceof File)||!types.has(file.type)||file.size===0||file.size>10_485_760)return NextResponse.redirect(new URL(`/organisateur/sorties/${tripId}?erreur=photo`,request.url),303);
  const owner=await ownedTrip(tripId);if(!owner)return NextResponse.json({error:"Accès refusé"},{status:403});
  const admin=createAdminClient();const {count}=await admin.from("trip_images").select("id",{count:"exact",head:true}).eq("trip_id",tripId);if((count??0)>=8)return NextResponse.redirect(new URL(`/organisateur/sorties/${tripId}?erreur=limite_photos`,request.url),303);
  const extension=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp";const path=`${tripId}/${crypto.randomUUID()}.${extension}`;
  const {error:uploadError}=await admin.storage.from("trip-images").upload(path,new Uint8Array(await file.arrayBuffer()),{contentType:file.type});if(uploadError)return NextResponse.redirect(new URL(`/organisateur/sorties/${tripId}?erreur=photo`,request.url),303);
  const publicUrl=admin.storage.from("trip-images").getPublicUrl(path).data.publicUrl;const {error}=await admin.from("trip_images").insert({trip_id:tripId,storage_path:path,public_url:publicUrl,alt_text:alt||`Photo de ${owner.trip.title}`,position:count??0});
  if(error){await admin.storage.from("trip-images").remove([path]);return NextResponse.redirect(new URL(`/organisateur/sorties/${tripId}?erreur=photo`,request.url),303);}
  return NextResponse.redirect(new URL(`/organisateur/sorties/${tripId}?succes=photo`,request.url),303);
}

export async function DELETE(request:Request){
  const form=await request.formData();const tripId=String(form.get("trip_id")??"");const imageId=String(form.get("image_id")??"");
  if(!uuid.test(tripId)||!uuid.test(imageId))return NextResponse.json({error:"Requête invalide"},{status:400});
  const owner=await ownedTrip(tripId);if(!owner)return NextResponse.json({error:"Accès refusé"},{status:403});
  const admin=createAdminClient();const {data:image}=await admin.from("trip_images").select("storage_path").eq("id",imageId).eq("trip_id",tripId).single();if(!image)return NextResponse.json({error:"Photo introuvable"},{status:404});
  await admin.storage.from("trip-images").remove([image.storage_path]);await admin.from("trip_images").delete().eq("id",imageId).eq("trip_id",tripId);
  return NextResponse.json({ok:true});
}
