import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
export async function POST(request: Request) {
  const form = await request.formData();
  const payload = Object.fromEntries(form.entries());
  if (!payload.title || !payload.activity || !payload.date || !payload.location || !payload.meeting_point) return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase n’est pas configuré" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: activity } = await supabase.from("activities").select("id").eq("name", String(payload.activity)).single();
  if (!activity) return NextResponse.json({ error: "Activité inconnue" }, { status: 400 });
  const duration = Number.parseInt(String(payload.duration), 10);const latitude=Number(payload.latitude),longitude=Number(payload.longitude);
  if(!Number.isFinite(latitude)||latitude< -90||latitude>90||!Number.isFinite(longitude)||longitude< -180||longitude>180)return NextResponse.json({error:"Placez le point de rendez-vous sur la carte"},{status:400});
  const { data:trip,error } = await supabase.from("trips").insert({
    organizer_id: user.id, activity_id: activity.id, title: String(payload.title), description: String(payload.description),
    location: String(payload.location),latitude,longitude,meeting_point:String(payload.meeting_point),date: String(payload.date),
    start_time: String(payload.time), duration: Number.isFinite(duration) ? duration * 60 : 180,
    difficulty: String(payload.difficulty || "debutant"), maximum_participants: Number(payload.maximum_participants || 8),
    price: Number(payload.price || 0), equipment: String(payload.equipment || ""), status: "en_attente"
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const image=form.get("image");
  if(trip&&image instanceof File&&image.size>0){
    const allowed=new Set(["image/jpeg","image/png","image/webp"]);
    if(!allowed.has(image.type)||image.size>10_485_760)return NextResponse.json({error:"Photo invalide (JPG, PNG ou WebP, 10 Mo maximum)"},{status:400});
    const extension=image.type==="image/jpeg"?"jpg":image.type==="image/png"?"png":"webp";const path=`${trip.id}/${crypto.randomUUID()}.${extension}`;const admin=createAdminClient();
    const {error:uploadError}=await admin.storage.from("trip-images").upload(path,new Uint8Array(await image.arrayBuffer()),{contentType:image.type});
    if(uploadError)return NextResponse.json({error:"La sortie a été créée, mais la photo n’a pas pu être envoyée"},{status:500});
    const publicUrl=admin.storage.from("trip-images").getPublicUrl(path).data.publicUrl;
    await admin.from("trip_images").insert({trip_id:trip.id,storage_path:path,public_url:publicUrl,alt_text:`Photo de ${String(payload.title)}`});
  }
  return NextResponse.redirect(new URL("/organisateur", request.url), 303);
}
