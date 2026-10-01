const MIN_SPLASH_TIME_MS=900;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function launch(start){
  await sleep(Math.max(0,MIN_SPLASH_TIME_MS-(Date.now()-start)));
  const w=window.open("/unframed/window.html","_blank");
  if(w){await sleep(120);window.close();return}
  const f=document.getElementById("fallback-controls"); if(f) f.style.display="block";
}
document.addEventListener("DOMContentLoaded",async()=>{
 const start=Date.now(), b=document.getElementById("permission-prompt");
 if(b)b.onclick=()=>window.getScreenDetails?.();
 if(navigator.permissions){
   try{
     const s=await navigator.permissions.query({name:"window-management"});
     if(s.state==="granted") launch(start);
     else { const f=document.getElementById("fallback-controls"); if(f)f.style.display="block";
       s.onchange=()=>s.state==="granted"&&launch(start);}
   }catch(e){launch(start)}
 } else launch(start);
});