"use strict";
import {html}  from 'js-to-html';
import {LOCAL_STORAGE_STATE_NAME} from "../unlogged/tipos";
import { desplegarFormularioActual, dmPantallaInicialSinCarga } from './render-formulario';
import { cargarEstructura, cargarHojaDeRuta, GLOVAR_ESTRUCTURA, GLOVAR_DATOSBYPASS } from './abrir-formulario';
const ServiceWorkerAdmin = require("service-worker-admin");

export const OPERATIVO = 'etoi211';


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

window.addEventListener('load', async function(){
    var layout = document.getElementById('total-layout')!;
    if(!layout){
        console.log('no encuentro el DIV.total-layout')
        await myOwn.ready;
        layout = document.getElementById('total-layout')!;
    }
    await myOwn.ready;
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
        var startApp:()=>Promise<void> = async ()=>{};
        if(hayHojaDeRuta()){
            startApp = async ()=>{
                var version = await swa.getSW('version');
                myOwn.setLocalVar('app-cache-version', version);
                //@ts-ignore existe 
                var datosByPass = my.getLocalVar(GLOVAR_DATOSBYPASS);
                cargarEstructura(my.getLocalVar(GLOVAR_ESTRUCTURA));
                cargarHojaDeRuta({ ...datosByPass, modoAlmacenamiento: 'local' });
                desplegarFormularioActual({ operativo: OPERATIVO, modoDemo: false, modoAlmacenamiento: 'local' });
                my.menuName = URL_DM;
            }
        }else{
            startApp = async ()=>{
                //@ts-ignore existe 
                dmPantallaInicialSinCarga();
            }
        }
        var refrescarStatus=async function(showScreen, newVersionAvaiable, installing){
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
            onEachFile: async (url, error)=>{
                console.log('file: ',url);
                document.getElementById('archivos')!.append(
                    html.div(url).create()
                )
            },
            onInfoMessage: (m)=>console.log('message: ', m),
            onError: async (err, context)=>{
                console.log('error: '+(context?` en (${context})`:''), err);
                console.log(context, err, 'error-console')
                console.log('error al descargar cache', err.message)
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
                    cacheStatusElement.textContent='error al descargar la aplicación. ' + err.message;
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
})

var hayHojaDeRuta = () =>
    myOwn.existsLocalVar(LOCAL_STORAGE_STATE_NAME)

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