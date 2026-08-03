import Image from "next/image";
import {redirect} from "next/navigation";
import {DashboardNav} from "@/components/dashboard-nav";
import {createClient} from "@/lib/supabase/server";
import {updateProfile} from "./actions";

export const metadata={title:"Mon profil"};

export default async function Profile({searchParams}:{searchParams:Promise<{upload?:string;profil?:string}>}){
  const q=await searchParams;const supabase=await createClient();if(!supabase)return null;
  const user=(await supabase.auth.getUser()).data.user;if(!user)redirect("/connexion");
  const profile=(await supabase.from("profiles").select("first_name,last_name,avatar_url,bio,city,user_type,identity_verified,average_rating,created_at").eq("id",user.id).single()).data;
  if(!profile)redirect("/connexion?erreur=profil");
  const initials=`${profile.first_name?.[0]??""}${profile.last_name?.[0]??""}`||"?";
  return <section className="page-shell"><DashboardNav role={profile.user_type}/>
    {q.upload==="ok"&&<p className="form-alert success">Photo de profil mise à jour.</p>}
    {q.upload&&q.upload!=="ok"&&<p className="form-alert error">La photo n’a pas pu être enregistrée. Utilisez une image JPG, PNG ou WebP de moins de 5 Mo.</p>}
    {q.profil==="ok"&&<p className="form-alert success">Informations personnelles enregistrées.</p>}
    {q.profil&&q.profil!=="ok"&&<p className="form-alert error">Les modifications n’ont pas pu être enregistrées. Vérifiez les champs.</p>}
    <div className="profile-hero">{profile.avatar_url?<Image className="profile-avatar profile-avatar-image" src={profile.avatar_url} alt="Photo de profil" width={125} height={125} unoptimized/>:<span className="profile-avatar">{initials}</span>}<div>{profile.identity_verified&&<span className="verified">✓ Profil vérifié</span>}<h1>{profile.first_name} {profile.last_name}</h1><p>{profile.bio||"Complétez votre biographie pour vous présenter à la communauté."}</p><div className="mini-stats"><span><b>{Number(profile.average_rating).toFixed(1)}</b> note</span><span><b>{profile.user_type==="organisateur"?"Organisateur":profile.user_type==="administrateur"?"Administrateur":"Participant"}</b></span></div></div></div>
    <div className="profile-grid"><section className="panel-card"><span className="eyebrow green">INFORMATIONS PERSONNELLES</span><h2>Modifier mon profil</h2><form className="big-form profile-edit-form" action={updateProfile}><div className="two-cols"><label>Prénom<input name="first_name" defaultValue={profile.first_name} minLength={2} required/></label><label>Nom<input name="last_name" defaultValue={profile.last_name} minLength={2} required/></label></div><label>Ville<input name="city" defaultValue={profile.city??""} maxLength={120}/></label><label>Biographie<textarea name="bio" defaultValue={profile.bio??""} rows={6} maxLength={2000} placeholder="Présentez vos centres d’intérêt et votre expérience…"/></label><button className="primary">Enregistrer mes informations</button></form></section>
    <aside><section className="panel-card"><span className="eyebrow green">PHOTO DE PROFIL</span><h2>Changer ma photo</h2><p>Choisissez une image enregistrée sur votre ordinateur ou votre téléphone. Formats acceptés : JPG, PNG ou WebP, 5 Mo maximum.</p><form className="avatar-upload-form" action="/api/storage/upload" method="post" encType="multipart/form-data"><input type="hidden" name="bucket" value="avatars"/><input type="hidden" name="redirect" value="/profil"/><label>Choisir une image<input className="file-input" type="file" name="file" accept="image/jpeg,image/png,image/webp" required/></label><button className="primary">Enregistrer la photo</button></form><small>Le choix du fichier reste local tant que vous ne cliquez pas sur « Enregistrer la photo ».</small></section><section className="panel-card"><h3>Compte</h3><p>📧 {user.email}</p><p>📍 {profile.city||"Ville non renseignée"}</p><p>📅 Membre depuis {new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(profile.created_at))}</p>{profile.user_type==="organisateur"&&<p><a className="secondary" href="/organisateur/onboarding">Modifier mon dossier organisateur</a></p>}</section></aside></div>
  </section>;
}
