var CACHE = 'rds-reaction-v103';

var PRECACHE = [
  '/rds-reaction-test/',
  '/rds-reaction-test/index.html',
  '/rds-reaction-test/manifest.json',
  '/rds-reaction-test/icon-192.png',
  '/rds-reaction-test/icon-512.png',
  '/rds-reaction-test/apple-touch-icon.png'
];

var NO_CACHE = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'gstatic.com'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.allSettled(
        PRECACHE.map(function(url){
          return c.add(url).catch(function(){});
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('message', function(e){
  if(e.data && e.data.action === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      /* borra cache vieja de ESTA app (deja intactas las de otras apps RDS,
         que comparten origen -- caches.keys() ve TODAS las del origen). */
      return Promise.all(
        keys.filter(function(k){ return k.indexOf('rds-reaction-')===0 && k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  var url = e.request.url;
  for(var i=0; i<NO_CACHE.length; i++){
    if(url.indexOf(NO_CACHE[i]) > -1) return;
  }

  // Network-first para la navegacion (el HTML): siempre intenta traer la version nueva.
  // OJO (2026-09-29): se guarda/busca con la clave fija del index.html,
  // NUNCA con e.request tal cual -- si se usara el request, la URL con
  // ?ini=&dep= que anade SuiteRDS al entrar desde ahi (o su ausencia en
  // otras visitas) generaria una clave distinta cada vez, y
  // caches.match(e.request) casi nunca encontraria la copia guardada --
  // rompia el offline justo al entrar desde SuiteRDS.
  if(e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request, {cache:'no-store'}).then(function(res){
        if(res && res.status === 200){
          var clone = res.clone();
          caches.open(CACHE).then(function(c){ c.put('/rds-reaction-test/index.html', clone); });
        }
        return res;
      }).catch(function(){
        return caches.match('/rds-reaction-test/index.html');
      })
    );
    return;
  }

  // Cache-first para el resto de recursos estaticos.
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(res){
        if(res && res.status === 200){
          var clone = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        }
        return res;
      }).catch(function(){
        return caches.match('/rds-reaction-test/index.html');
      });
    })
  );
});
