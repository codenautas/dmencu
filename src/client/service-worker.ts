"use strict";
const CACHE_NAME = '#20-11-05';
const FALLBACK = 'campo';
var urlsToCache = [
    "campo",
    /*
    "lib/react.production.min.js",
    "lib/react-dom.production.min.js",
    "lib/material-ui.production.min.js",
    */
   "lib/react.development.js",
   "lib/react-dom.development.js",
   "lib/material-ui.development.js",
   "lib/clsx.min.js",
    "lib/redux.min.js",
    "lib/react-redux.min.js",
    "lib/require-bro.js",
    "lib/like-ar.js",
    "lib/best-globals.js",
    "lib/json4all.js",
    "lib/js-to-html.js",
    "lib/redux-typed-reducer.js",
    "lib/memoize-one.js",
    "adapt.js",
    "tipos.js",
    "digitov.js",
    "redux-formulario.js",
    "render-general.js",
    "render-formulario.js",
    "client_modules/row-validator.js",
    "unlogged.js",
    "lib/js-yaml.js",
    "lib/xlsx.core.min.js",
    "lib/lazy-some.js",
    "lib/sql-tools.js",
    "dialog-promise/dialog-promise.js",
    "moment/min/moment.js",
    "pikaday/pikaday.js",
    "lib/polyfills-bro.js",
    "lib/big.js",
    "lib/type-store.js",
    "lib/typed-controls.js",
    "lib/ajax-best-promise.js",
    "my-ajax.js",
    "my-start.js",
    "lib/my-localdb.js",
    "lib/my-websqldb.js",
    "lib/my-localdb.js.map",
    "lib/my-websqldb.js.map",
    "lib/my-inform-net-status.js",
    "lib/my-skin.js",
    "lib/cliente-en-castellano.js",
    "client/client.js",
    "client/menu.js",
    "dialog-promise/dialog-promise.css",
    "pikaday/pikaday.css",
    "css/offline-mode.css",
    "css/formulario-react.css",
    "img/main-loading.gif",
];
self.addEventListener('install', async (event)=>{
    //si hay cambios no espero para cambiarlo
    self.skipWaiting();
    console.log("instalando")
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache)=>
            cache.addAll(urlsToCache)
        )
    );
});

self.addEventListener('fetch', (event)=>{
    var sourceParts = event.request.url.split('/');
    var source:string = sourceParts[sourceParts.length-1];
    console.log("source",source)
    if(source=='@version'){
        var miBlob = new Blob();
        var opciones = { "status" : 200 , "statusText" : CACHE_NAME, ok:true };
        var miRespuesta = new Response(miBlob,opciones);
        event.respondWith(miRespuesta);
    }else{
        event.respondWith(
            caches.open(CACHE_NAME).then((cache)=>
                cache.match(event.request).then((response)=>{
                    console.log("respuesta caché: ", response)
                    return response || fetch(event.request).then((response)=>{
                        console.log("respuesta", response)
                        if(!response) {
                            console.log("no tiene respuesta")
                            throw Error('without response');
                        }
                        return response;
                    }).catch((err)=>{
                        console.log(err)
                        return new Response(`<p>Se produjo un error al intentar cargar la p&aacute;gina, es posible que no haya conexi&oacute;n a internet</p><a href=${FALLBACK}>Volver a Hoja de Ruta</button>`, {
                            headers: {'Content-Type': 'text/html'}
                        });
                    });
                })
            )
        );
    }
});
self.addEventListener('activate', (event)=>{
    console.log("borrando caches viejas")
    event.waitUntil(
        caches.keys().then((cacheNames)=>{
            return Promise.all(
                cacheNames.filter((cacheName)=>
                    cacheName != CACHE_NAME
                ).map((cacheName)=>{
                    console.log("borrando cache ", cacheName);
                    return caches.delete(cacheName);
                })
            );
        })
    );
});