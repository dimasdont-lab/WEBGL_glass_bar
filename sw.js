const CACHE='webgl-glass-bar-v1';
const CORE=['./','./index.html','./whisper-worker.js','./manifest.webmanifest','./glass-bar.css','./glass-bar.js','./glass-background.js','./vendor/html2canvas-1.4.1.min.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('webgl-glass-bar-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  // App shell: network first prevents an installed iPhone PWA from being stuck
  // on old JS. Cross-origin model/runtime files keep their own browser cache.
  if(url.origin===self.location.origin){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(response=>{
      const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return response;
    }).catch(()=>caches.match(e.request)));
  }
});
