"use strict";
import {html}  from 'js-to-html';
import * as AjaxBestPromise from "ajax-best-promise";
import {LOCAL_STORAGE_STATE_NAME} from "../unlogged/redux-formulario";
//import {CACHE_NAME} from "service-worker";
import { desplegarFormularioActual, desplegarFormularioConsultaResultados } from './render-formulario';

function siExisteId(id: string, hacer: (arg0: HTMLElement) => void){
    var elemento = document.getElementById(id);
    if(elemento!=null){
        hacer(elemento);
    }
}

function mostrarElementoId(id:string, mostrar:boolean){
    siExisteId(id, e=>e.style.display=mostrar?'block':'none');
}

window.addEventListener('load', async function(){
    var layout = document.getElementById('total-layout')!;
    if(!layout){
        console.log('no encuentro el DIV.total-layout')
        await myOwn.ready;
        layout = document.getElementById('total-layout')!;
    }
    await myOwn.ready;
    layout.innerHTML='<div id=main_layout></div><span id="mini-console"></span>';
    var url = new URL(window.location.href);
    if(location.pathname.endsWith('/campo')){
        if(!myOwn.existsLocalVar(LOCAL_STORAGE_STATE_NAME)){
            var avisoInicial=html.div({class:'aviso-inicial'},[
                html.div({id:'dm-cargando', style:'display:none'},[
                    html.p('Cargando el formulario'), 
                    //html.img({src:'img/logo-dm.png'}),
                ]),
                html.div({id:'dm-instalandose', style:'display:none'},[
                    html.p('Instalando el sistema de relevamiento'),
                    //html.img({src:'img/logo-dm.png'}),
                ]),
                html.div({id:'dm-comprobando', style:'display:block'},[
                    html.p('Verificando la instalación del sistema'),
                    //html.img({src:'img/logo-dm.png'}),
                ])
            ]).create()
            layout.appendChild(avisoInicial);        
        }
        if('serviceWorker' in navigator){
            navigator.serviceWorker.register('service-worker.js').then(function(reg) {
                console.log('Registered:', reg);
                //updatefound is fired if service-worker.js changes.
                reg.onupdatefound = function() {
                    // The updatefound event implies that reg.installing is set; see
                    // https://w3c.github.io/ServiceWorker/#service-worker-registration-updatefound-event
                    var installingWorker = reg.installing;
                    setMessage('Instalando una nueva version, por favor espere...','warning');
                    installingWorker.onstatechange = async function() {
                        console.log("estado: ", installingWorker.state);
                        switch (installingWorker.state) {
                            case 'installed':
                                if (navigator.serviceWorker.controller) {
                                // At this point, the old content will have been purged and the fresh content will
                                // have been added to the cache.
                                // It's the perfect time to display a "New content is available; please refresh."
                                // message in the page's interface.
                                console.log('New or updated content is available.');
                                
                                } else {
                                // At this point, everything has been precached.
                                // It's the perfect time to display a "Content is cached for offline use." message.
                                console.log('Content is now available offline!');
                                }
                                setMessage(`Aplicación actualizada, por favor refresque la pantalla`,'all-ok');
                                break;
                            case 'activated':
                                setMessage(`Aplicación actualizada, espere a que se refresque la pantalla`,'all-ok');
                                setTimeout(async function(){
                                    location.reload(true);
                                },3000)
                                break;
                            case 'redundant':
                                console.error('The installing service worker became redundant.');
                                setMessage('Se produjo un error al instalar la aplicación. ','danger')
                                break;
                        }
                    };
                };
            }).catch(function(e) {
                console.error('Error during service worker registration:', e);
            });
            try{
                var response = await fetch("@version");
                console.log('v', response.statusText)
                var version = response.statusText;
                my.setLocalVar('app-version', version);
            }catch(err){
                console.log("error al buscar version.", err)
            }finally{
                desplegarFormularioActual({modoDemo:false});
            }
        }else{
            console.log('serviceWorkers no soportados')
            setMessage('Service workers no soportados por el navegador. La aplicación no funcionará sin conexión a internet. ','danger')
            desplegarFormularioActual({modoDemo:false});    
        }
    }else if(location.pathname.endsWith('/consulta')){
        desplegarFormularioConsultaResultados();
    }
})

async function setMessage(message:string, color:'all-ok'|'warning'|'danger'){
    var layout = await awaitForCacheLayout;
    var cacheStatusElement = document.getElementById('cache-status');
    if(!cacheStatusElement){
        cacheStatusElement = html.p({id:'cache-status'}).create();
        layout.insertBefore(cacheStatusElement, layout.firstChild);
    }
    cacheStatusElement.classList.remove('warning')
    cacheStatusElement.classList.add(color)
    cacheStatusElement.textContent=message;
}

export var awaitForCacheLayout = async function prepareLayoutForCache(){
    await new Promise(function(resolve, _reject){
        window.addEventListener('load',resolve);
    });
    var layout=(document.getElementById('cache-layout')||document.createElement('div'));
    if(!layout.id){
        layout.id='cache-layout';
        layout.appendChild(html.div({id:'app-versions'}).create());
        layout.appendChild(html.div({id:'app-status'}).create());
        document.body.appendChild(layout.appendChild(html.div({id:'cache-log'}).create()));
        document.body.insertBefore(layout,document.body.firstChild)
    }
    return layout;
}();



var wasDownloading=false;
//var appCache = window.applicationCache;
//appCache.addEventListener('downloading', async function() {
//    mostrarElementoId('dm-comprobando', false)
//    mostrarElementoId('dm-instalandose', true)
//    mostrarElementoId('dm-cargando', false)
//    wasDownloading=true;
//    var layout = await awaitForCacheLayout;
//    layout.insertBefore(
//        html.p({id:'cache-status', class:'warning'},[
//            'descargando aplicación, por favor no desconecte el dispositivo',
//            html.img({src:'img/loading16.gif'}).create()
//        ]).create(), 
//        layout.firstChild
//    );
//}, false);
//
//appCache.addEventListener('error', async function(e:Event) {
//    // @ts-ignore es ErrorEvent porque el evento es 'error'
//    var errorEvent:ErrorEvent = e;
//    if(wasDownloading){
//        console.log('error al descargar cache', errorEvent.message)
//        var layout = await awaitForCacheLayout;
//        var cacheStatusElement = document.getElementById('cache-status');
//        if(!cacheStatusElement){
//            cacheStatusElement = html.p({id:'cache-status'}).create();
//            layout.insertBefore(cacheStatusElement, layout.firstChild);
//        }
//        cacheStatusElement.classList.remove('warning')
//        cacheStatusElement.classList.add('danger')
//        cacheStatusElement.textContent='error al descargar la aplicación. ' + errorEvent.message;
//    }
//}, false);
//
//async function cacheReady(){
//    wasDownloading=false;
//    var result:string = await AjaxBestPromise.get({
//        url:'carga-dm/dm-manifest.manifest',
//        data:{}
//    });
//    myOwn.setLocalVar('app-cache-version',result.split('\n')[1]);
//    mostrarElementoId('dm-comprobando', false)
//    mostrarElementoId('dm-instalandose', false)
//    mostrarElementoId('dm-cargando', true)
//    setTimeout(function(){
//        var cacheStatusElement = document.getElementById('cache-status')!;
//        if(!cacheStatusElement){
//            var mainLayout = document.getElementById('main_layout')!;
//            cacheStatusElement = html.p({id:'cache-status'}).create();
//            mainLayout.insertBefore(cacheStatusElement, mainLayout.firstChild);
//        }
//        setTimeout(function(){
//            cacheStatusElement.classList.add('all-ok')
//            cacheStatusElement.textContent='aplicación actualizada, espere a cargar el formulario';
//            setTimeout(function(){
//                cacheStatusElement.style.display='none';
//            }, 5000);
//            setTimeout(function(){
//                location.reload();
//            },2000)
//        }, 5000);
//    },500)
//}
//appCache.addEventListener('updateready', function () {
//    console.log("actualiza cache");
//    if (appCache.status == appCache.UPDATEREADY) {
//        console.log("swap cache");
//        appCache.swapCache()
//    }
//    cacheReady()
//}, false);
//appCache.addEventListener('cached', function() {
//    console.log("cachea primera vez");
//    cacheReady()
//}, false );
//