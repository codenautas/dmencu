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
        layout.innerHTML = `
    <span id="mini-console"></span>
    
    <!-- Banner de Nueva Versión (Protagonismo Absoluto - Centro de la Pantalla) -->
    <div id="nueva-version-instalada" style="
        position: fixed; 
        top: 35%; 
        left: 50%; 
        transform: translate(-50%, -50%); 
        z-index: 99999; 
        display: none;
        background-color: #2e7d32; /* MUI Success Principal */
        color: white;
        padding: 32px 48px;
        border-radius: 8px;
        box-shadow: 0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,0.14);
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 24px;
        font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
        text-align: center;
        min-width: 300px;
        max-width: 90%;
        padding: 25px;
    ">
        <div style="display: flex; flex-direction: column; gap: 8px;">
            <span style="font-size: 22px; font-weight: 500; letter-spacing: 0.25px;">¡Aplicación actualizada!</span>
        </div>
        <button id="refrescar" style="
            background-color: #ffffff;
            color: #2e7d32;
            border: none;
            padding: 10px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 700;
            font-size: 14px;
            text-transform: uppercase;
            box-shadow: 0px 3px 5px -1px rgba(0,0,0,0.2);
            transition: background-color 0.2s, transform 0.1s;
            display: flex;
            align-items: center;
            gap: 8px;
            letter-spacing: 0.4px;
            margin: 15px auto;
        ">
            Continuar
        </button>
    </div>

    <div id="instalado" style="display:none">
        <div id="main_layout"></div>
    </div>
    
    <!-- Panel de Progreso Ocupando Más Pantalla (Limpio y Corporativo) -->
    <div id="instalando" style="
        display: none;
        top: 40px;
        left: 40px;
        right: 40px;
        bottom: 40px;
        background-color: #ffffff; /* Fondo blanco limpio MUI */
        color: #1e293b;
        padding: 32px;
        border-radius: 8px;
        box-shadow: 0px 8px 24px rgba(0,0,0,0.12);
        z-index: 99998;
        font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
        display: flex;
        flex-direction: column;
        border: 1px solid #e2e8f0;
        overflow: hidden;
        min-height: 0;
    ">
        <div id="volver-de-instalacion" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 16px;
            flex-shrink: 0;
        ">
            <div style="display: flex; align-items: center; gap: 14px;">
                <!-- Spinner Minimalista de MUI (CircularProgress) -->
                <div style="
                    width: 20px; 
                    height: 20px; 
                    border: 2px solid #e2e8f0; 
                    border-radius: 50%; 
                    border-top-color: #1976d2; /* MUI Primary */
                    animation: sw-spin 0.8s linear infinite;
                "></div>
                <style>@keyframes sw-spin { to { transform: rotate(360deg); } }</style>
                <span id="volver-de-instalacion-por-que" style="color: #1976d2; font-weight: 700; font-size: 13px; letter-spacing: 0.8px;">DESCARGANDO RECURSOS DE LA APLICACIÓN</span>
            </div>
            <button id="volver-de-instalacion-como" style="
                background-color: transparent;
                color: #64748b;
                border: 1px solid #cbd5e1;
                padding: 6px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 700;
                font-size: 12px;
                text-transform: uppercase;
                transition: background-color 0.2s;
            ">Volver</button>
        </div>
        
        <h2 style="color: #1e293b; font-size: 18px; font-weight: 400; margin: 0 0 16px 0;">Historial de instalación</h2>
        
        <!-- Consola expandida y limpia sin estética terminal -->
        <div id="archivos" style="
            flex-grow: 1;
            flex-shrink: 1;
            height: 100%;
            min-height: 0;
            overflow-y: auto;
            font-size: 13px;
            font-family: monospace;
            line-height: 1.6;
            color: #475569;
            background-color: #f8fafc; /* Gris muy tenue, nada gamer */
            padding: 16px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
            margin-bottom: 16px
        ">
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
                onEachFile: async (url: string, _error: Error | null) => {
                    console.log('file: ', url);

                    const archivosContenedor = document.getElementById('archivos');
                    if (archivosContenedor) {
                        archivosContenedor.append(
                            html.div({
                                style: 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 2px 0;'
                            }, `> ${url}`).create()
                        );
                        // Autoscroll para ver el archivo más reciente al fondo de la consola
                        archivosContenedor.scrollTop = archivosContenedor.scrollHeight;
                    }
                },
                onInfoMessage: (m: string)=>console.log('message: ', m),
                onError: async (err: Error, context: string) => {
                    var error = expected(err);
                    console.log('error: ' + (context ? ` en (${context})` : ''), error);
                    console.log(context, error, 'error-console');
                    console.log('error al descargar cache', error.message);

                    if (context != 'initializing service-worker') {
                        try {
                            // Validamos silenciosamente si el problema es falta de sesión (401)
                            await my.ajax['keep-alive.json']();
                        } catch (pingErr) {
                            console.log('Fallo de caché por sesión expirada. Desplegando banner flotante.');

                            const instalandoElem = document.getElementById('instalando');
                            if (instalandoElem) instalandoElem.style.display = 'none';

                            // Remueve el panel de descarga si saltó el error de sesión
                            const panelArchivos = document.getElementById('panel-archivos-flotante');
                            if (panelArchivos) panelArchivos.remove();

                            let updateBanner = document.getElementById('notification-update-banner');
                            if (!updateBanner) {
                                var layout = await awaitForCacheLayout;
                                updateBanner = html.div({
                                    id: 'notification-update-banner',
                                    style: `
                            position: fixed;
                            top: 20px; /* Cambiado arriba */
                            right: 20px; /* Cambiado a la derecha */
                            background-color: #2c3e50;
                            color: #ffffff;
                            padding: 16px;
                            border-radius: 8px;
                            box-shadow: 0px 4px 12px rgba(0,0,0,0.3);
                            display: flex;
                            flex-direction: column;
                            gap: 12px;
                            max-width: 320px;
                            z-index: 99999; /* A la misma altura que los modales de React */
                            font-family: sans-serif;
                            border-left: 5px solid #3498db;
                        `
                                }).create();
                                layout.appendChild(updateBanner);
                            }

                            updateBanner.innerHTML = '';

                            // Botón de cierre cruz (X)
                            const botonCerrar = html.span({
                                style: 'position: absolute; top: 8px; right: 12px; cursor: pointer; color: #bdc3c7; font-weight: bold; font-size: 14px;'
                            }, '×').create();
                            botonCerrar.onclick = () => updateBanner!.remove();
                            botonCerrar.onmouseover = () => { botonCerrar.style.color = '#ffffff'; };
                            botonCerrar.onmouseout = () => { botonCerrar.style.color = '#bdc3c7'; };

                            const textoContenido = html.div({ style: 'font-size: 14px; line-height: 1.4; padding-right: 12px;' },
                                'Hay una nueva versión disponible, pero requiere iniciar sesión nuevamente.'
                            ).create();

                            const botonLogin = html.button({
                                style: 'background-color: #3498db; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; align-self: flex-end;'
                            }, 'Iniciar Sesión').create();

                            botonLogin.onmouseover = () => { botonLogin.style.backgroundColor = '#2980b9'; };
                            botonLogin.onmouseout = () => { botonLogin.style.backgroundColor = '#3498db'; };
                            botonLogin.onclick = () => {
                                window.location.href = `${location.origin + location.pathname}/../login`;
                            };

                            updateBanner.appendChild(botonCerrar);
                            updateBanner.appendChild(textoContenido);
                            updateBanner.appendChild(botonLogin);
                            return; // Cortamos acá para evitar la barra roja
                        }

                        // Si el ping anduvo bien pero llegó acá, es un error real de red/offline
                        var layout = await awaitForCacheLayout;
                        var cacheStatusElement = document.getElementById('cache-status');
                        if (!cacheStatusElement) {
                            cacheStatusElement = html.p({ id: 'cache-status' }).create();
                            layout.insertBefore(cacheStatusElement, layout.firstChild);
                        }
                        cacheStatusElement.classList.remove('warning', 'all-ok');
                        cacheStatusElement.classList.add('danger');
                        cacheStatusElement.textContent = 'error al descargar la aplicación. ' + error.message;
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