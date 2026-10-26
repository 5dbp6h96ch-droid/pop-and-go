"use strict";
const API="https://itaoljnqwoiifztjlfyc.supabase.co";
const KEY="sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV";
const $=id=>document.getElementById(id);

async function loadPublishedDesign(){
 try{
 const response=await fetch(API+"/rest/v1/published_design?select=published",{headers:{apikey:KEY,Accept:"application/json"},cache:"no-store"});
 if(!response.ok)return;
 const data=await response.json(),c=data?.[0]?.published;
 const keys=["background","surface","primary","accent","text","soft","border","nav"];
 if(!c||keys.some(k=>!/^#[0-9a-f]{6}$/i.test(c[k]||"")))return;
 const style=document.createElement("style");
 style.textContent=`body,main{background:${c.background}!important;color:${c.text}!important}:root{--violet:${c.primary};--lime:${c.accent};--lavender:${c.soft};--ink:${c.text}}header,#start{background:${c.primary}!important}.card,.filter-row{background:${c.surface}!important;border-color:${c.border}!important}.chips button:not(.active),.searchline select,#showMap{background:${c.soft}!important}.chips button.active{background:${c.primary}!important}.discover-actions #random,.card-footer a:first-child,.bottom-nav #navNew .nav-icon,#startDiscover{background:${c.accent}!important}.bottom-nav{background:${c.nav}!important}`;
 document.head.append(style);
 }catch(error){console.warn("Design-Einstellungen nicht geladen",error)}
}
loadPublishedDesign();

let places=[],categories=[],category="Alle",search="",sort="asc",selectedLocality="",radius="",map=null;
let favorites;try{favorites=new Set(JSON.parse(localStorage.getItem("popgo-favorites-v1")||"[]"))}catch{favorites=new Set()}
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==null)e.textContent=text;if(cls)e.className=cls;return e};
function distanceKm(a,b,c,d){const rad=Math.PI/180,dl=(c-a)*rad,dn=(d-b)*rad,x=Math.sin(dl/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(dn/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(x)))}
function validGps(p){return p.latitude!=null&&p.longitude!=null&&Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude))&&Math.abs(Number(p.latitude))<=90&&Math.abs(Number(p.longitude))<=180}
function originCoords(){const matches=places.filter(p=>p.locality===selectedLocality&&validGps(p));if(!matches.length)return null;return [matches.reduce((v,p)=>v+Number(p.latitude),0)/matches.length,matches.reduce((v,p)=>v+Number(p.longitude),0)/matches.length]}
function current(){
 const q=search.toLocaleLowerCase("de"),center=radius&&selectedLocality?originCoords():null;
 return places.filter(p=>(category==="Alle"||p.categories?.label===category)&&(radius||!selectedLocality||p.locality===selectedLocality)&&[p.name,p.locality,p.notes||"",p.categories?.label||""].join(" ").toLocaleLowerCase("de").includes(q)&&(!radius||(center&&validGps(p)&&distanceKm(center[0],center[1],Number(p.latitude),Number(p.longitude))<=Number(radius))))
 .sort((a,b)=>sort==="locality"?(a.locality||"").localeCompare(b.locality||"","de")||a.name.localeCompare(b.name,"de"):(sort==="asc"?1:-1)*a.name.localeCompare(b.name,"de"))
}
function link(url,text,cls){const a=node("a",text,cls);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a}
function appleMaps(p){return "https://maps.apple.com/?q="+encodeURIComponent((p.address&&p.address.trim())?p.address:[p.name,p.locality].filter(Boolean).join(", "))}
function makeCard(p){
 const box=node("article",null,"card");
 const top=node("div",null,"card-top");
 const icon=node("span",null,"card-symbol");icon.setAttribute("aria-hidden","true");
 const paths={Restaurant:'<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3v18M17 3c-4 4-4 9 0 11"/>',Café:'<path d="M4 8h13v6a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V8ZM17 9h2a3 3 0 0 1 0 6h-2M7 3v2M12 3v2"/>',Biergarten:'<path d="M12 21V11M12 11c-5 0-8-3-8-8 5 0 8 3 8 8ZM12 15c5 0 8-3 8-8-5 0-8 3-8 8ZM7 21h10"/>',Aktivität:'<path d="m3 20 7-13 4 7 3-5 4 11H3ZM16 3v4M14 5h4"/>',Beachbar:'<path d="m4 4 8 8 8-8H4ZM12 12v8M7 20h10M17 8l3 3M20 8l-3 3"/>',Weinlounge:'<path d="M5 3h14v5a7 7 0 0 1-14 0V3ZM12 15v6M7 21h10M6 8h12"/>'};
 icon.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">'+(paths[p.categories?.label]||'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>')+'</svg>';
 const content=node("div",null,"card-content");
 content.append(node("span",p.categories?.label||"Freizeitidee","tag"),node("h3",p.name),node("p",p.locality||"Ort nicht angegeben","sub"));
 top.append(icon,content);
 const fav=node("button",favorites.has(p.id)?"♥":"♡","favourite");fav.type="button";fav.setAttribute("aria-label",favorites.has(p.id)?"Aus Favoriten entfernen":"Zu Favoriten hinzufügen");fav.setAttribute("aria-pressed",String(favorites.has(p.id)));fav.onclick=()=>{favorites.has(p.id)?favorites.delete(p.id):favorites.add(p.id);try{localStorage.setItem("popgo-favorites-v1",JSON.stringify([...favorites]))}catch{}render()};
 top.append(fav);box.append(top);
 if(p.notes){const n=node("p",p.notes,"card-note");box.append(n)}
 const foot=node("div",null,"card-footer");foot.append(link(appleMaps(p),"↗ Apple Karten","external-link"));if(p.website_url&&/^https:\/\//i.test(p.website_url))foot.append(link(p.website_url,"↗ Website","external-link"));box.append(foot);
 return box
}
function render(){const hits=current();$("cards").replaceChildren(...(hits.length?hits.map(makeCard):[node("p","Keine passenden Freizeitideen gefunden.","empty")]));const liked=places.filter(p=>favorites.has(p.id));$("favcards").replaceChildren(...(liked.length?liked.map(makeCard):[node("p","Noch keine Favoriten gespeichert.","empty")]));$("status").textContent=hits.length+" von "+places.length+" Freizeitideen";$("discoverCount").textContent=hits.length+" Ideen";const filters=$("filters");filters.replaceChildren();for(const label of ["Alle",...categories.map(c=>c.label)]){const b=node("button",label,label===category?"active":"");b.setAttribute("aria-pressed",String(category===label));b.onclick=()=>{category=label;render();if(map&& !$("mapping").hidden)drawMap()};filters.append(b)}if(!$("mapping").hidden)drawMap()}
function chooseMapPlace(p){const panel=$("mapPlace");panel.replaceChildren();panel.append(node("strong",p.name),node("p",p.locality||"Ort nicht angegeben","sub"));const a=link(appleMaps(p),"In Apple Karten öffnen ↗","external-link");a.style.cssText="display:inline-flex;background:#7040ee;color:white;padding:12px 16px;border-radius:12px;text-decoration:none;font-weight:700;margin-top:8px";panel.append(a)}
function renderUnmapped(){const list=current().filter(p=>p.latitude==null||p.longitude==null);$("unmappedCount").textContent=list.length+" ohne Marker";$("unmappedList").replaceChildren(...(list.length?list.map(p=>{const box=node("article",null,"card");box.append(node("strong",p.name),node("p",p.address||p.locality||"Kein Standort angegeben","sub"));const a=link(appleMaps(p),p.address?"Adresse in Apple Karten suchen":"Ort in Apple Karten suchen","external-link");box.append(a);return box}):[node("p","Alle gefilterten Orte sind auf der Karte.","empty")]))}
function drawMap(){renderUnmapped();if(typeof L==="undefined"){$("mapCount").textContent="Kartenbibliothek nicht verfügbar";return}if(!map){map=L.map("map",{scrollWheelZoom:false}).setView([49.45,8.55],9);L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap contributors",maxZoom:18}).addTo(map)}map.eachLayer(layer=>{if(layer instanceof L.Marker)map.removeLayer(layer)});const pins=[];for(const p of current()){if(p.latitude==null||p.longitude==null)continue;const latitude=Number(p.latitude),longitude=Number(p.longitude);if(!Number.isFinite(latitude)||!Number.isFinite(longitude))continue;const m=L.marker([latitude,longitude]).addTo(map);const box=node("div");box.append(node("strong",p.name),node("p",p.locality||""));box.append(link(appleMaps(p),"Apple Karten öffnen"));m.bindPopup(box);pins.push(m)}$("mapCount").textContent=pins.length+" Orte mit Koordinaten";if(pins.length)map.fitBounds(L.featureGroup(pins).getBounds().pad(.18),{maxZoom:12});setTimeout(()=>map.invalidateSize(),30)}
for(const btn of document.querySelectorAll("[data-view]"))btn.onclick=()=>{const view=btn.dataset.view;document.querySelectorAll("main section").forEach(s=>s.hidden=s.id!==view);document.querySelectorAll("[data-view]").forEach(b=>{b.classList.toggle("active",b===btn);if(b===btn)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});if(view==="mapping")setTimeout(drawMap,40)};
$("query").oninput=e=>{search=e.target.value.trim();render()};$("sort").onchange=e=>{sort=e.target.value;render()};
$("localityFilter").onchange=e=>{selectedLocality=e.target.value;if(radius&&!selectedLocality){radius="";$("radiusFilter").value=""}updateRadiusHint();render()};
$("radiusFilter").onchange=e=>{radius=e.target.value;if(radius&&!selectedLocality){radius="";e.target.value="";$("radiusHint").textContent="Bitte zuerst einen Ort als Ausgangspunkt auswählen.";return}updateRadiusHint();render()};
function updateRadiusHint(){$("radiusHint").textContent=radius?(originCoords()?"Umkreis um die ungefähre Mitte der vorhandenen Orte in "+selectedLocality+". Einträge ohne GPS werden ausgeblendet.":"Für diesen Ort fehlen Koordinaten; bitte Umkreis auf Unbegrenzt setzen."):""}
$("showMap").onclick=()=>{
 document.querySelectorAll("main section").forEach(section=>section.hidden=section.id!=="mapping");
 document.querySelectorAll("[data-view]").forEach(button=>{button.classList.remove("active");button.removeAttribute("aria-current")});
 $("mapCount").textContent="Karte wird geladen …";
 window.scrollTo({top:0,behavior:"instant"});
 setTimeout(()=>{try{drawMap()}catch(error){$("mapCount").textContent="Karte konnte nicht geöffnet werden: "+error.message}},100);
};
$("backDiscover").onclick=()=>document.querySelector('[data-view="discover"]')?.click();
$("navNew").onclick=()=>{document.querySelectorAll("main section").forEach(section=>section.hidden=section.id!=="newSection");document.querySelectorAll(".bottom-nav button").forEach(button=>{button.classList.toggle("active",button.id==="navNew");button.removeAttribute("aria-current")});$("navNew").setAttribute("aria-current","page");};
$("startDiscover").onclick=()=>document.querySelector('[data-view="discover"]')?.click();
$("random").onclick=()=>{const results=current();if(!results.length)return;const p=results[Math.floor(Math.random()*results.length)];$("randomResult").textContent="Zufallstipp: "+p.name+" · "+(p.locality||"");$("status").textContent="Zufallsvorschlag: "+p.name+" · "+p.locality;const target=document.querySelector("#cards .card");if(target){const chosen=Array.from($("cards").children).find(e=>e.querySelector("h3")?.textContent===p.name);if(chosen){chosen.scrollIntoView({behavior:"smooth",block:"center"});chosen.style.outline="3px solid #7040ee";setTimeout(()=>chosen.style.outline="",1700)}}};
(async()=>{try{const headers={apikey:KEY,Accept:"application/json"};const [p,c]=await Promise.all([fetch(API+"/rest/v1/places?select=id,name,locality,address,notes,website_url,latitude,longitude,categories(label)&status=eq.published&order=name.asc",{headers}),fetch(API+"/rest/v1/categories?select=id,label&order=label.asc",{headers})]);if(!p.ok||!c.ok)throw Error("Supabase "+p.status+"/"+c.status);places=await p.json();categories=await c.json();const towns=[...new Set(places.map(x=>x.locality).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"));for(const town of towns){const option=node("option",town);option.value=town;$("localityFilter").append(option)}render()}catch(error){$("status").textContent="Freizeitideen konnten nicht geladen werden: "+error.message}})();