"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidPassword, normalizeSignupIntent, postSignupDestination } from "@/lib/domain/rules";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
async function authClient() { const client = await createClient(); if (!client) redirect("/connexion?erreur=configuration"); return client; }

export async function signIn(form: FormData) {
  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
  if (error) redirect("/connexion?erreur=identifiants");
  redirect("/profil");
}

export async function signUp(form: FormData) {
  const supabase = await authClient();
  if (form.get("legal_acceptance") !== "accepted") redirect("/inscription?erreur=conditions");
  const password = String(form.get("password") ?? "");
  if (!isValidPassword(password)) redirect("/inscription?erreur=mot_de_passe");
  const intent = normalizeSignupIntent(String(form.get("signup_intent") ?? "participer"));
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email") ?? ""), password,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/bienvenue`, data: { first_name: String(form.get("first_name") ?? ""), last_name: String(form.get("last_name") ?? ""), signup_intent: intent } }
  });
  if (error) redirect("/inscription?erreur=inscription");
  redirect(postSignupDestination(intent, Boolean(data.session)));
}

export async function sendMagicLink(form: FormData) {
  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithOtp({ email: String(form.get("email") ?? ""), options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl()}/auth/callback?next=/profil` } });
  if (error) redirect("/connexion?erreur=lien_magique");
  redirect("/connexion?confirmation=lien_envoye");
}

export async function signInWithGoogle() {
  const supabase = await authClient();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${siteUrl()}/auth/callback?next=/bienvenue` } });
  if (error || !data.url) redirect("/connexion?erreur=google");
  redirect(data.url);
}

export async function requestPasswordReset(form: FormData) {
  const supabase = await authClient();
  const { error } = await supabase.auth.resetPasswordForEmail(String(form.get("email") ?? ""), { redirectTo: `${siteUrl()}/auth/callback?next=/mot-de-passe/nouveau` });
  if (error) redirect("/mot-de-passe/oublie?erreur=envoi");
  redirect("/mot-de-passe/oublie?confirmation=envoyee");
}

export async function updatePassword(form: FormData) {
  const password = String(form.get("password") ?? "");
  if (!isValidPassword(password)) redirect("/mot-de-passe/nouveau?erreur=mot_de_passe");
  const supabase = await authClient(); const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/mot-de-passe/nouveau?erreur=session");
  redirect("/connexion?confirmation=mot_de_passe_modifie");
}
