import type { MetadataRoute } from "next";
import {createAdminClient} from "@/lib/supabase/admin";

const baseUrl = "https://www.nito-nature.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    "",
    "/explorer",
    "/a-propos",
    "/aide",
    "/contact",
    "/mentions-legales",
    "/conditions",
    "/confidentialite",
    "/cookies",
    "/annulations",
    "/transparence",
    "/signalement-litiges",
    "/securite-sportive",
  ];

  const staticPages:MetadataRoute.Sitemap=pages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/explorer" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/explorer" ? 0.9 : 0.5,
  }));
  const {data:trips}=await createAdminClient().from("trips").select("id,updated_at").eq("status","publiee").gte("date",new Date().toISOString().slice(0,10)).order("date");
  return [...staticPages,...(trips??[]).map(trip=>({url:`${baseUrl}/sorties/${trip.id}`,lastModified:new Date(trip.updated_at),changeFrequency:"weekly" as const,priority:0.8}))];
}
