import { createBrowserClient } from "@supabase/ssr";
export function createClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error("Configuration Supabase publique manquante");
  return createBrowserClient(url,key);
}

