"use strict";
import {html}  from 'js-to-html';
import { desplegarFormularioActual } from './render-formulario';
import { DatosByPassPersistibles, ModoDM } from './tipos';
import { expected } from "cast-error";
const ServiceWorkerAdmin = require("service-worker-admin");
import { createLocalStorageFormRenderer } from "./render-init";
import { BACKUPS } from './abrir-formulario';
import { getFormRenderer } from "./render-config";

function siExisteId(id: string, hacer: (arg0: HTMLElement) => void){
    var elemento = document.getElementById(id);
    if(elemento!=null){
        hacer(elemento);
    }
}

function mostrarElementoId(id:string, mostrar:boolean){
    siExisteId(id, e=>e.style.display=mostrar?'block':'none');
}
const URL_DM = 'campo';

var reloadWithoutHash = ()=>{
    history.replaceState(null, '', `${location.origin+location.pathname}/../${URL_DM}`);
    location.reload()
}

async function sincronizarDatos(persistentes: DatosByPassPersistibles | null, cambiaModoDM: boolean) {
    const formRenderer = getFormRenderer();
    let modoDM: ModoDM = formRenderer.getModoDM() || await my.ajax.modo_dm_defecto_obtener({});
    formRenderer.setModoDM(modoDM);
    const idper_logueado_tablet = formRenderer.getIdperLogueado();
    var datos = await my.ajax.dm_sincronizar({ persistentes, modo_dm: modoDM, cambia_modo_dm: cambiaModoDM, idper_logueado_tablet });
    await formRenderer.persistirDatos({ ...datos, modoAlmacenamiento: 'local' });
    var estructura = await myOwn.ajax.operativo_estructura_completa({ operativo: datos.operativo, idper_logueado_tablet });
    await formRenderer.persistirEstructura(estructura);
    my.removeLocalVar(BACKUPS);
    return datos;
}

window.addEventListener('load', async function(){
    var layout = document.getElementById('total-layout')!;
    if(!layout){
        console.log('no encuentro el DIV.total-layout')
        await myOwn.ready;
        layout = document.getElementById('total-layout')!;
    }
    await myOwn.ready;
    if(location.pathname.endsWith('/salvar')){
        try{
            for (let x in localStorage){
                console.log(localStorage[x]);
                await myOwn.ajax.dm_rescatar({localStorageItem:localStorage[x], localStorageItemKey:x})
                layout.append(
                    html.p(`item "${x}" de localStogage guardado.`).create()
                )
            }
            layout.append(
                html.p(`todos los items fueron salvados.`).create()
            )
        }catch(err){
            layout.append(
                html.p(`se produjo un error al salvar los datos del dm.`).create()
            )
        }
        try{
            var registrations = await navigator.serviceWorker.getRegistrations();
            for(let registration of registrations) {
                await registration.unregister()
            }
            layout.append(
                html.p(`todos los sw fueron desinstalados.`).create()
            )
        }catch(err){
            layout.append(
                html.p(`se produjo un error al desinstalar los sw.`).create()
            )
        }
    }else{
        layout.innerHTML=`
            <span id="mini-console"></span>
            <div id=nueva-version-instalada style="position:fixed; top:5px; z-index:9500; display:none">
                <span>Hay una nueva versión instalada </span><button id=refrescar><span class=rotar>↻</span> refrescar</button>
            </div>
            <div id=instalado style="display:none">
                <div id=main_layout></div>
            </div>
            <div id=instalando style="display:none; margin-top:30px">
                <div id=volver-de-instalacion style="position:fixed; top:5px; z-index:9500;">
                    <span id=volver-de-instalacion-por-que></span>
                    <button id=volver-de-instalacion-como>volver</button>
                </div>
                <div id=archivos>
                    <h2>progreso instalacion</h2>
                </div>
            </div>
        `;
        if(location.pathname.endsWith(`/${URL_DM}`)){
            const formRenderer = createLocalStorageFormRenderer({ onSincronizar: sincronizarDatos });
            const startApp = async () => {
                try {
                    var modoDmDefecto: ModoDM = formRenderer.getModoDM() || await my.ajax.modo_dm_defecto_obtener({});
                    formRenderer.setModoDM(modoDmDefecto);
                } catch (err) {
                    console.log('no se pudo traer el modo por defecto')
                }
                var version = await swa.getSW('version');
                formRenderer.setAppCacheVersion(version);
                desplegarFormularioActual(formRenderer, {});
                my.menuName = URL_DM;
            }
            var refrescarStatus=async function(showScreen: string, newVersionAvaiable: string, _installing: any){
                var buscandoActualizacion = location.href.endsWith('#inst=1');
                document.getElementById('nueva-version-instalada')!.style.display=newVersionAvaiable=='yes'?'':'none';
                document.getElementById('volver-de-instalacion')!.style.display=newVersionAvaiable=='yes'?'none':'';
                if(showScreen=='app' && !buscandoActualizacion){
                    document.getElementById('instalado')!.style.display='';
                    document.getElementById('instalando')!.style.display='none';
                }else{
                    document.getElementById('instalado')!.style.display='none';
                    document.getElementById('instalando')!.style.display='';
                }
            };
            var swa = new ServiceWorkerAdmin();
            swa.installOrActivate({
                onEachFile: async (url: string, _error: Error | null)=>{
                    console.log('file: ',url);
                    document.getElementById('archivos')!.append(
                        html.div(url).create()
                    )
                },
                onInfoMessage: (m: string)=>console.log('message: ', m),
                onError: async (err: Error, context: string)=>{
                    var error = expected(err);
                    console.log('error: '+(context?` en (${context})`:''), error);
                    console.log(context, error, 'error-console')
                    console.log('error al descargar cache', error.message)
                    if(context!='initializing service-worker'){
                        var layout = await awaitForCacheLayout;
                        var cacheStatusElement = document.getElementById('cache-status');
                        if(!cacheStatusElement){
                            cacheStatusElement = html.p({id:'cache-status'}).create();
                            layout.insertBefore(cacheStatusElement, layout.firstChild);
                        }
                        cacheStatusElement.classList.remove('warning')
                        cacheStatusElement.classList.remove('all-ok')
                        cacheStatusElement.classList.add('danger')
                        cacheStatusElement.textContent='error al descargar la aplicación. ' + error.message;
                    }
                },
                onReadyToStart:startApp,
                onStateChange:refrescarStatus
            });
        }
        document.getElementById('refrescar')!.addEventListener('click',()=>{
            reloadWithoutHash()
        });
        document.getElementById('volver-de-instalacion-como')!.addEventListener('click',()=>{
            reloadWithoutHash()
        });
    }
})

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