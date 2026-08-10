const INDEXNOW_KEY="f727f4d861a846efa846d1250b83f752";
const SITE="https://www.nito-nature.fr";

export async function notifyIndexNow(paths:string[]){
  const urlList=[...new Set(paths.map(path=>path.startsWith("http")?path:`${SITE}${path.startsWith("/")?path:`/${path}`}`))];
  if(!urlList.length)return;
  try{
    const response=await fetch("https://api.indexnow.org/indexnow",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({host:"www.nito-nature.fr",key:INDEXNOW_KEY,keyLocation:`${SITE}/${INDEXNOW_KEY}.txt`,urlList})});
    if(!response.ok&&response.status!==202)console.error("IndexNow",response.status,await response.text());
  }catch(error){console.error("IndexNow indisponible",error)}
}
