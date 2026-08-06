"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export async function markNotificationsRead(){const supabase=await createClient();if(!supabase)redirect("/connexion");const user=(await supabase.auth.getUser()).data.user;if(!user)redirect("/connexion");await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",user.id).is("read_at",null);revalidatePath("/notifications");}
