const activities = [
  {name:"Ornithologie",icon:"🦉"},{name:"Randonnée",icon:"🥾"},{name:"Escalade",icon:"🧗"},
  {name:"Photo nature",icon:"📷"},{name:"Botanique",icon:"🌿"},{name:"Astronomie",icon:"🔭"},
  {name:"Canoë",icon:"🛶"},{name:"Trail",icon:"🏃"},{name:"Champignons",icon:"🍄"},{name:"Pêche",icon:"🎣"}
];

const defaultTrips = [
 {id:1,title:"Les oiseaux de la forêt au lever du jour",activity:"Ornithologie",location:"Forêt de Fontainebleau",date:"2026-08-08",time:"06:30",duration:"3 h",level:"Débutant",price:18,capacity:8,booked:5,rating:4.9,reviews:24,host:"Claire Martin",hostPhoto:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",image:"https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=900&q=80",description:"Une balade douce pour apprendre à reconnaître les oiseaux communs par leur chant, leur silhouette et leur comportement.",equipment:"Chaussures fermées, vêtements discrets, eau et jumelles si vous en avez.",meeting:"Parking de la Faisanderie",kids:true,pets:false,lat:68,lng:69},
 {id:2,title:"Premiers pas en escalade sur bloc",activity:"Escalade",location:"Fontainebleau",date:"2026-08-12",time:"09:30",duration:"4 h",level:"Débutant",price:32,capacity:6,booked:4,rating:4.8,reviews:18,host:"Thomas Berger",hostPhoto:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",image:"https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=900&q=80",description:"Découverte de l'escalade de bloc, apprentissage des règles de sécurité et des gestes essentiels sur des passages accessibles.",equipment:"Tenue souple, eau. Chaussons et tapis fournis.",meeting:"Gare de Fontainebleau-Avon",kids:false,pets:false,lat:62,lng:71},
 {id:3,title:"Randonnée photo au cœur des étangs",activity:"Photo nature",location:"Rambouillet",date:"2026-08-16",time:"08:00",duration:"5 h",level:"Intermédiaire",price:24,capacity:10,booked:6,rating:4.7,reviews:31,host:"Sophie Renard",hostPhoto:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",description:"Une sortie mêlant marche, observation et conseils de photographie pour mieux saisir la lumière et la faune.",equipment:"Appareil photo ou smartphone, chaussures de marche, pique-nique.",meeting:"Entrée de l'Espace Rambouillet",kids:true,pets:false,lat:22,lng:76},
 {id:4,title:"Découverte des plantes sauvages comestibles",activity:"Botanique",location:"Parc de Saint-Cloud",date:"2026-08-21",time:"10:00",duration:"2 h 30",level:"Débutant",price:15,capacity:12,booked:8,rating:4.9,reviews:42,host:"Élodie Garnier",hostPhoto:"https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80",image:"https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80",description:"Apprenez à identifier quelques plantes sauvages courantes, leurs usages et les précautions indispensables.",equipment:"Carnet, stylo, chaussures confortables.",meeting:"Grille d'honneur du parc",kids:true,pets:true,lat:38,lng:46},
 {id:5,title:"Nuit des étoiles et lecture du ciel",activity:"Astronomie",location:"Parc naturel du Vexin",date:"2026-08-23",time:"21:30",duration:"3 h",level:"Débutant",price:0,capacity:15,booked:11,rating:4.6,reviews:16,host:"Julien Lopez",hostPhoto:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80",image:"https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80",description:"Une soirée d'initiation pour repérer les principales constellations et comprendre les objets visibles à l'œil nu.",equipment:"Vêtements chauds, lampe rouge, couverture.",meeting:"Maison du Parc du Vexin",kids:true,pets:true,lat:32,lng:20},
 {id:6,title:"Balade en canoë sur le Loing",activity:"Canoë",location:"Nemours",date:"2026-08-29",time:"11:00",duration:"4 h",level:"Intermédiaire",price:38,capacity:8,booked:3,rating:4.8,reviews:12,host:"Marc Petit",hostPhoto:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",image:"https://images.unsplash.com/photo-1559523161-0fc0d8b38a7a?auto=format&fit=crop&w=900&q=80",description:"Descente conviviale du Loing avec pauses nature et rappel des techniques de navigation.",equipment:"Maillot, chaussures d'eau, tenue de rechange. Matériel nautique fourni.",meeting:"Base nautique de Nemours",kids:false,pets:false,lat:75,lng:82}
];

let trips = JSON.parse(localStorage.getItem("ne_trips") || "null") || defaultTrips;
let bookings = JSON.parse(localStorage.getItem("ne_bookings") || "[]");
let favorites = JSON.parse(localStorage.getItem("ne_favorites") || "[]");
let selectedTrip = null;
let activeConversation = 0;
let reviewScore = 5;

const conversations = [
 {name:"Claire Martin",photo:defaultTrips[0].hostPhoto,trip:"Sortie ornithologie",messages:[
  {me:false,text:"Bonjour Fabien, merci pour votre réservation !",time:"10:21"},
  {me:true,text:"Avec plaisir. Faut-il absolument apporter des jumelles ?",time:"10:24"},
  {me:false,text:"Non, j'en apporterai deux paires à prêter au groupe.",time:"10:26"}]},
 {name:"Thomas Berger",photo:defaultTrips[1].hostPhoto,trip:"Escalade sur bloc",messages:[
  {me:false,text:"Le rendez-vous est bien maintenu samedi matin.",time:"Hier"},
  {me:true,text:"Parfait, merci pour la confirmation.",time:"Hier"}]},
 {name:"Sophie Renard",photo:defaultTrips[2].hostPhoto,trip:"Randonnée photo",messages:[
  {me:true,text:"Bonjour, la sortie est-elle adaptée à un appareil compact ?",time:"Lun."},
  {me:false,text:"Oui, tout à fait. Le cadrage compte plus que le matériel.",time:"Lun."}]}
];

const notifications = [
 "Claire a confirmé votre réservation pour la sortie ornithologie.",
 "Une nouvelle sortie botanique est disponible à moins de 15 km.",
 "Rappel : votre sortie escalade commence dans 2 jours."
];

function persist(){localStorage.setItem("ne_trips",JSON.stringify(trips));localStorage.setItem("ne_bookings",JSON.stringify(bookings));localStorage.setItem("ne_favorites",JSON.stringify(favorites))}
function formatDate(d){return new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"numeric",month:"short"}).format(new Date(d+"T12:00:00"))}
function money(n){return n===0?"Gratuit":new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n)}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}
function activityIcon(name){return (activities.find(a=>a.name===name)||{icon:"🌲"}).icon}

function fillSelect(id, allLabel="Toutes les activités"){
 const el=document.getElementById(id); if(!el)return;
 el.innerHTML=`<option value="">${allLabel}</option>`+activities.map(a=>`<option>${a.name}</option>`).join("");
}
["heroActivity","filterActivity"].forEach(id=>fillSelect(id));
fillSelect("createActivity","Choisir une activité");

document.getElementById("heroDate").value="2026-08-01";
document.querySelector('[name="date"]').value="2026-08-15";

function tripCard(t){
 const fav=favorites.includes(t.id);
 return `<article class="trip-card">
   <div class="trip-image" style="background-image:url('${t.image}')">
    <button class="favorite" data-fav="${t.id}">${fav?"♥":"♡"}</button><span class="price">${money(t.price)}</span>
   </div>
   <div class="trip-body" data-open="${t.id}">
    <span class="eyebrow green">${activityIcon(t.activity)} ${t.activity.toUpperCase()}</span>
    <h3>${t.title}</h3>
    <div class="trip-meta"><span>📍 ${t.location}</span><span>📅 ${formatDate(t.date)} · ${t.time}</span><span>◷ ${t.duration}</span></div>
    <div class="host-row"><div class="host"><img src="${t.hostPhoto}" alt=""><span>${t.host}</span></div><span class="rating">★ ${t.rating}</span></div>
   </div>
 </article>`;
}

function renderHome(){
 document.getElementById("featuredTrips").innerHTML=trips.slice(0,3).map(tripCard).join("");
 document.getElementById("activityGrid").innerHTML=activities.slice(0,6).map(a=>`<button class="activity-card" data-activity="${a.name}"><span>${a.icon}</span><b>${a.name}</b><small>${trips.filter(t=>t.activity===a.name).length} sortie(s)</small></button>`).join("");
 bindCards();
}
function filteredTrips(){
 const q=document.getElementById("searchText").value.toLowerCase(), act=document.getElementById("filterActivity").value,
 level=document.getElementById("filterLevel").value, price=document.getElementById("filterPrice").value, date=document.getElementById("filterDate").value;
 let list=trips.filter(t=>(!q||`${t.title} ${t.location}`.toLowerCase().includes(q))&&(!act||t.activity===act)&&(!level||t.level===level)&&(!date||t.date===date)&&(!price||(price==="free"?t.price===0:t.price>0)));
 const sort=document.getElementById("sortTrips").value;
 return list.sort((a,b)=>sort==="rating"?b.rating-a.rating:sort==="price"?a.price-b.price:a.date.localeCompare(b.date));
}
function renderExplore(){
 const list=filteredTrips(); document.getElementById("resultCount").textContent=`${list.length} sortie${list.length>1?"s":""} trouvée${list.length>1?"s":""}`;
 document.getElementById("tripResults").innerHTML=list.map(tripCard).join("")||"<p>Aucune sortie ne correspond à vos critères.</p>"; bindCards();
}
function bindCards(){
 document.querySelectorAll("[data-open]").forEach(el=>el.onclick=()=>openTrip(+el.dataset.open));
 document.querySelectorAll("[data-fav]").forEach(el=>el.onclick=e=>{e.stopPropagation();const id=+el.dataset.fav;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];persist();renderHome();renderExplore();toast(favorites.includes(id)?"Ajouté aux favoris":"Retiré des favoris")});
 document.querySelectorAll("[data-activity]").forEach(el=>el.onclick=()=>{route("explorer");document.getElementById("filterActivity").value=el.dataset.activity;renderExplore()});
}
function openTrip(id){
 selectedTrip=trips.find(t=>t.id===id); route("detail");
 const t=selectedTrip;
 document.getElementById("tripDetail").innerHTML=`<div class="detail-cover" style="background-image:url('${t.image}')"><div class="detail-title"><span class="eyebrow">${t.activity.toUpperCase()}</span><h1>${t.title}</h1><p>📍 ${t.location}</p></div></div>
 <div class="detail-grid"><div>
  <div class="panel-card info-row"><div class="info-tile"><small>Date</small><b>${formatDate(t.date)}</b></div><div class="info-tile"><small>Horaire</small><b>${t.time}</b></div><div class="info-tile"><small>Durée</small><b>${t.duration}</b></div><div class="info-tile"><small>Niveau</small><b>${t.level}</b></div></div>
  <section class="panel-card"><h3>À propos de cette sortie</h3><p>${t.description}</p><h4>Matériel nécessaire</h4><p>${t.equipment}</p><h4>Point de rendez-vous</h4><p>📍 ${t.meeting}</p><p>${t.kids?"✓ Enfants autorisés":"✕ Non recommandé aux enfants"} · ${t.pets?"✓ Animaux acceptés":"✕ Animaux non acceptés"}</p></section>
  <section class="panel-card"><h3>Votre passionné</h3><div class="host-large"><img src="${t.hostPhoto}"><div><b>${t.host}</b><p>✓ Identité vérifiée · ★ ${t.rating} (${t.reviews} avis)</p></div></div><p>Passionné local et organisateur expérimenté, engagé pour une découverte respectueuse et accessible de la nature.</p></section>
  <section class="panel-card"><h3>Avis des participants</h3>${sampleReviews().map(r=>`<div class="review"><b>${r.name}</b> · ★★★★★<p>${r.text}</p></div>`).join("")}<button id="leaveReview" class="secondary">Laisser un avis</button></section>
 </div><aside><div class="panel-card booking-card"><span class="big-price">${money(t.price)}</span><span> / personne</span><p>📅 ${formatDate(t.date)} à ${t.time}</p><p>👥 ${t.capacity-t.booked} place(s) restante(s)</p><button id="bookNow" class="primary wide">Réserver</button><p><small>Annulation gratuite jusqu'à 48 h avant la sortie.</small></p></div></aside></div>`;
 document.getElementById("bookNow").onclick=()=>openBooking(t);
 document.getElementById("leaveReview").onclick=()=>document.getElementById("reviewModal").classList.add("open");
}
function sampleReviews(){return[{name:"Camille",text:"Une sortie très pédagogique et chaleureuse. J'ai appris énormément de choses."},{name:"Nicolas",text:"Organisation parfaite, rythme adapté aux débutants et superbe ambiance."}]}
function openBooking(t){
 document.getElementById("bookingSummary").innerHTML=`<div class="panel-card"><b>${t.title}</b><p>${formatDate(t.date)} · ${t.location}</p><p>${money(t.price)} par personne</p></div>`;
 document.getElementById("bookingModal").classList.add("open");
}
document.getElementById("confirmBooking").onclick=()=>{
 const qty=+document.getElementById("bookingQty").value||1;if(!selectedTrip)return;
 if(selectedTrip.booked+qty>selectedTrip.capacity){toast("Il ne reste pas assez de places.");return}
 selectedTrip.booked+=qty;bookings.push({tripId:selectedTrip.id,qty,status:"Confirmée"});persist();document.getElementById("bookingModal").classList.remove("open");toast("Réservation confirmée !");openTrip(selectedTrip.id);renderCalendar();renderAdmin();
};

function renderMap(){
 document.getElementById("mapTrips").innerHTML=trips.map(t=>`<div class="mini-trip" data-open="${t.id}"><b>${activityIcon(t.activity)} ${t.title}</b><p>${formatDate(t.date)} · ${money(t.price)}</p><small>${t.location}</small></div>`).join("");
 document.getElementById("mapMarkers").innerHTML=trips.map(t=>`<button class="marker" data-open="${t.id}" style="left:${t.lat}%;top:${t.lng-30}%"><span>${activityIcon(t.activity)}</span></button>`).join("");bindCards();
}
function renderMessages(){
 const q=(document.getElementById("messageSearch").value||"").toLowerCase();
 document.getElementById("conversationList").innerHTML=conversations.map((c,i)=>({c,i})).filter(x=>x.c.name.toLowerCase().includes(q)).map(({c,i})=>`<div class="conversation ${i===activeConversation?"active":""}" data-conv="${i}"><img src="${c.photo}"><div><b>${c.name}</b><small>${c.trip}</small><small>${c.messages.at(-1).text.slice(0,35)}...</small></div></div>`).join("");
 document.querySelectorAll("[data-conv]").forEach(el=>el.onclick=()=>{activeConversation=+el.dataset.conv;renderMessages()});
 const c=conversations[activeConversation];document.getElementById("chatHeader").innerHTML=`${c.name} <small>· ${c.trip}</small>`;
 document.getElementById("chatMessages").innerHTML=c.messages.map(m=>`<div class="bubble ${m.me?"me":""}">${m.text}<small>${m.time}</small></div>`).join("");
 document.getElementById("chatMessages").scrollTop=99999;
}
document.getElementById("messageForm").onsubmit=e=>{e.preventDefault();const v=document.getElementById("messageInput").value.trim();if(!v)return;conversations[activeConversation].messages.push({me:true,text:v,time:"À l'instant"});document.getElementById("messageInput").value="";renderMessages()};
document.getElementById("messageSearch").oninput=renderMessages;

function renderCalendar(){
 const date=new Date(2026,7,1), days=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
 let html=days.map(d=>`<div class="cal-head">${d}</div>`).join("");
 const offset=(date.getDay()+6)%7;
 for(let i=0;i<offset;i++)html+=`<div class="cal-day muted"></div>`;
 for(let d=1;d<=31;d++){const ds=`2026-08-${String(d).padStart(2,"0")}`, ev=trips.filter(t=>t.date===ds&&bookings.some(b=>b.tripId===t.id));html+=`<div class="cal-day"><b>${d}</b>${ev.map(t=>`<div class="cal-event">${activityIcon(t.activity)} ${t.time} ${t.title.slice(0,18)}</div>`).join("")}</div>`}
 document.getElementById("calendar").innerHTML=html;
 const booked=bookings.map(b=>trips.find(t=>t.id===b.tripId)).filter(Boolean);document.getElementById("calendarEvents").innerHTML=booked.length?`<h3>Mes prochaines sorties</h3>${booked.map(t=>`<div class="panel-card"><b>${formatDate(t.date)} — ${t.title}</b><p>${t.location} · ${t.time}</p></div>`).join("")}`:"<p>Vous n'avez encore aucune réservation.</p>";
}
document.getElementById("exportCalendar").onclick=()=>{
 const booked=bookings.map(b=>trips.find(t=>t.id===b.tripId)).filter(Boolean);let ics="BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//NaturEnsemble//FR\n";
 booked.forEach(t=>{ics+=`BEGIN:VEVENT\nSUMMARY:${t.title}\nDTSTART:${t.date.replaceAll("-","")}T${t.time.replace(":","")}00\nLOCATION:${t.location}\nDESCRIPTION:${t.description}\nEND:VEVENT\n`});ics+="END:VCALENDAR";
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([ics],{type:"text/calendar"}));a.download="mes-sorties-naturensemble.ics";a.click();
};

document.getElementById("createTripForm").onsubmit=e=>{
 e.preventDefault();const f=new FormData(e.target), id=Math.max(...trips.map(t=>t.id))+1;
 const t={id,title:f.get("title"),activity:f.get("activity"),location:f.get("location"),date:f.get("date"),time:f.get("time"),duration:f.get("duration"),level:f.get("level"),price:+f.get("price"),capacity:+f.get("capacity"),booked:0,rating:5,reviews:0,host:"Fabien Lebrun",hostPhoto:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",image:"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80",description:f.get("description"),equipment:f.get("equipment")||"À préciser avec l'organisateur.",meeting:f.get("meeting"),kids:!!f.get("kids"),pets:!!f.get("pets"),lat:45+Math.random()*30,lng:45+Math.random()*30};
 trips.unshift(t);persist();e.target.reset();toast("Votre sortie a été publiée.");renderHome();renderExplore();renderMap();renderProfile();renderAdmin();openTrip(id);
};

function renderProfile(){
 document.getElementById("myTrips").innerHTML=trips.filter(t=>t.host==="Fabien Lebrun").map(t=>`<div class="admin-row"><span>${activityIcon(t.activity)} <b>${t.title}</b><small>${formatDate(t.date)} · ${t.booked}/${t.capacity} participants</small></span><button class="secondary" data-open="${t.id}">Voir</button></div>`).join("")||"<p>Aucune sortie créée pour le moment.</p>";
 document.getElementById("profileReviews").innerHTML=sampleReviews().map(r=>`<div class="review"><b>${r.name}</b> · ★★★★★<p>${r.text}</p></div>`).join("");bindCards();
}
document.getElementById("editProfile").onclick=()=>toast("Le mode édition du profil est prêt à être relié à une base de données.");
document.getElementById("safetyBtn").onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(()=>toast("Position partagée de manière simulée."),()=>toast("Autorisation de localisation refusée.")):toast("Géolocalisation indisponible.");
document.getElementById("reportBtn").onclick=()=>toast("Le signalement a été transmis à la modération.");

function renderAdmin(){
 document.getElementById("adminTripCount").textContent=trips.length;document.getElementById("adminBookingCount").textContent=bookings.length;
 document.getElementById("moderationTable").innerHTML=trips.slice(0,6).map(t=>`<div class="admin-row"><span><b>${t.title}</b><small>${t.host}</small></span><span>${t.price>0?"Payante":"Gratuite"}</span><button class="secondary approve">Valider</button></div>`).join("");
 document.querySelectorAll(".approve").forEach(b=>b.onclick=()=>{b.textContent="Validée ✓";b.disabled=true;toast("Sortie validée")});
}

function route(name){
 document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));const p=document.getElementById(`page-${name}`)||document.getElementById("page-accueil");p.classList.add("active");window.scrollTo({top:0,behavior:"smooth"});
 if(name==="explorer")renderExplore();if(name==="carte")renderMap();if(name==="messages")renderMessages();if(name==="calendrier")renderCalendar();if(name==="profil")renderProfile();if(name==="admin")renderAdmin();
 location.hash=name;
}
document.querySelectorAll("[data-route]").forEach(b=>b.onclick=()=>route(b.dataset.route));
window.addEventListener("hashchange",()=>route(location.hash.slice(1)||"accueil"));
document.getElementById("heroSearch").onclick=()=>{route("explorer");document.getElementById("filterActivity").value=document.getElementById("heroActivity").value;document.getElementById("filterDate").value=document.getElementById("heroDate").value;document.getElementById("searchText").value=document.getElementById("heroPlace").value;renderExplore()};
["searchText","filterActivity","filterLevel","filterPrice","filterDate","sortTrips"].forEach(id=>document.getElementById(id).addEventListener("input",renderExplore));
document.getElementById("resetFilters").onclick=()=>{["searchText","filterActivity","filterLevel","filterPrice","filterDate"].forEach(id=>document.getElementById(id).value="");renderExplore()};
document.getElementById("toggleMap").onclick=()=>route("carte");
document.getElementById("notifList").innerHTML=notifications.map((n,i)=>`<div class="notif-item"><b>${n}</b><small>${i===0?"Il y a 10 min":i===1?"Il y a 2 h":"Hier"}</small></div>`).join("");
document.getElementById("notifBtn").onclick=()=>document.getElementById("notifPanel").classList.add("open");
document.querySelector(".close-panel").onclick=()=>document.getElementById("notifPanel").classList.remove("open");
document.querySelectorAll(".modal-close").forEach(b=>b.onclick=()=>b.closest(".modal").classList.remove("open"));
document.querySelectorAll(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove("open")});
document.querySelectorAll("#reviewStars button").forEach((b,i)=>b.onclick=()=>{reviewScore=i+1;document.querySelectorAll("#reviewStars button").forEach((x,j)=>x.classList.toggle("selected",j<=i))});
document.querySelectorAll("#reviewStars button").forEach(x=>x.classList.add("selected"));
document.getElementById("submitReview").onclick=()=>{document.getElementById("reviewModal").classList.remove("open");toast(`Merci pour votre avis de ${reviewScore}/5 !`)};
document.getElementById("mobileMenuBtn").onclick=()=>{const nav=document.querySelector(".main-nav");nav.style.display=nav.style.display==="flex"?"none":"flex"};

renderHome();renderExplore();renderMap();renderMessages();renderCalendar();renderProfile();renderAdmin();
route(location.hash.slice(1)||"accueil");
