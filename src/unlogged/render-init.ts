import { BACKUPS, GLOVAR_ESTRUCTURA } from "./abrir-formulario";
import { setFormularioConfig } from "./render-config";
import { DatosByPassPersistibles, ModoDM } from "./tipos";


const LOCAL_STORAGE_STATE_NAME = 'hdr-state';
const LAST_AUTO_VALUE_PK_RAIZ = 'proximo_valor_pk_raiz';
const APP_CACHE_VERSION = 'app-cache-version';
const MODO_DM_LOCALSTORAGE_KEY = 'modo_dm';

export function initFormRenderer() {
    setFormularioConfig({
        getCasoState() {
            return myOwn.getLocalVar(LOCAL_STORAGE_STATE_NAME);
        },

        setCasoState(state) {
            myOwn.setLocalVar(LOCAL_STORAGE_STATE_NAME, state);
        },

        getUltimoValorPkRaiz() {
            return myOwn.getLocalVar(LAST_AUTO_VALUE_PK_RAIZ);
        },

        setUltimoValorPkRaiz(value) {
            myOwn.setLocalVar(LAST_AUTO_VALUE_PK_RAIZ, value);
        },

        getAppCacheVersion() {
            return myOwn.getLocalVar(APP_CACHE_VERSION);
        },

        setAppCacheVersion(version: string) {
            myOwn.setLocalVar(APP_CACHE_VERSION, version);
        },
        
        getModoDM() {
            return myOwn.getLocalVar(MODO_DM_LOCALSTORAGE_KEY);
        },
        
        setModoDM(modo: ModoDM) {
            myOwn.setLocalVar(MODO_DM_LOCALSTORAGE_KEY, modo);
        },

        getIdperLogueado() {
            return myOwn.getLocalVar('setup').idper;
        },
        getUsernameLogueado() {
            return myOwn.getLocalVar('setup').username;
        },
        async sincronizar(persistentes: DatosByPassPersistibles, modoDM: ModoDM, cambiaModoDM: boolean, idPerLogueado: string) {
            var datosResponse = await my.ajax.dm_sincronizar({
                persistentes, 
                modo_dm: modoDM, 
                cambia_modo_dm: cambiaModoDM, 
                idper_logueado_tablet: idPerLogueado 
            });
            var operativo = datosResponse.operativo;
            persistirEnMemoria({ ...datosResponse, modoAlmacenamiento: 'local' });
            var estructura = await traerEstructura({ operativo })
            myOwn.setLocalVar(GLOVAR_ESTRUCTURA, estructura);
            myOwn.removeLocalVar(BACKUPS);
            return datosResponse;
        },
    });
}