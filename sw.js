var CACHE = 'rds-reaction-v49';

var PRECACHE = [
  '/rds-reaction-test/',
  '/rds-reaction-test/index.html',
  '/rds-reaction-test/manifest.json',
  '/rds-reaction-test/icon.jpg'
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
  for(var i=0; i<NO_CACHE.length; i++){
    if(url.indexOf(NO_CACHE[i]) > -1) return;
  }

  // Network-first para la navegacion (el HTML): siempre intenta traer la version nueva.
  if(e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request).then(function(res){
        if(res && res.status === 200){
          var clone = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        }
        return res;
      }).catch(function(){
        return caches.match(e.request).then(function(cached){
          return cached || caches.match('/rds-reaction-test/index.html');
        });
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
