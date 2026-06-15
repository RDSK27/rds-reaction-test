var CACHE = 'rds-reaction-v3';

// Archivos a cachear al instalar
var PRECACHE = [
  '/rds-reaction-test/',
  '/rds-reaction-test/index.html',
  '/rds-reaction-test/manifest.json',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js'
];

// URLs que NUNCA cachear (Firebase API calls)
var NO_CACHE = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.allSettled(
        PRECACHE.map(function(url){
          return c.add(url).catch(function(err){
            console.warn('SW: no se pudo cachear', url, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  var url = e.request.url;

  // No interceptar llamadas a Firebase
  for(var i=0; i<NO_CACHE.length; i++){
    if(url.indexOf(NO_CACHE[i]) > -1){
      return;
    }
  }

  // Para navegación: Cache First, fallback a red, fallback a cache raíz
  if(e.request.mode === 'navigate'){
    e.respondWith(
      caches.match(e.request).then(function(cached){
        return cached || fetch(e.request).then(function(res){
          return caches.open(CACHE).then(function(c){
            c.put(e.request, res.clone());
            return res;
          });
        });
      }).catch(function(){
        return caches.match('/rds-reaction-test/index.html') ||
               caches.match('/rds-reaction-test/');
      })
    );
    return;
  }

  // Para el resto: Cache First
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(res){
        // Solo cachear respuestas válidas de dominios conocidos
        if(res && res.status === 200 && res.type !== 'opaque'){
          return caches.open(CACHE).then(function(c){
            c.put(e.request, res.clone());
            return res;
          });
        }
        return res;
      }).catch(function(){
        return new Response('Sin conexion', {status: 503});
      });
    })
  );
});
