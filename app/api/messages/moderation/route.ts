import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request){
  const supabase=await createClient();if(!supabase)return NextResponse.json({error:"Supabase non configuré"},{status:503});
  const user=(await supabase.auth.getUser()).data.user;if(!user)return NextResponse.json({error:"Non authentifié"},{status:401});
  const {action,user_id,trip_id,reason,details}=await request.json();
  if(action==="block"){
    const {error}=await supabase.from("user_blocks").upsert({blocker_id:user.id,blocked_id:user_id});
    return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true});
  }
  if(action==="report"){
    const {error}=await supabase.from("reports").insert({reporter_id:user.id,reported_user_id:user_id,trip_id:trip_id||null,reason:reason||"comportement",details:details||"Signalement depuis la messagerie"});
    return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true});
  }
  return NextResponse.json({error:"Action inconnue"},{status:400});
}
