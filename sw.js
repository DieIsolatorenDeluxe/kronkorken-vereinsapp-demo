const CACHE='kronkorken-icons-v1';
const ICONS=['app-icon-180.png','app-icon-192.png','app-icon-512.png','app-icon-maskable-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ICONS))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// Never cache forms, submissions, HTML, personal data or contact requests.
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!ICONS.some(name=>url.href===new URL(name,self.registration.scope).href))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
