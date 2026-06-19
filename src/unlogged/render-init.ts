import { createFormRenderer, FormRenderer } from "./render-config";
import { DatosByPassPersistibles, ModoDM, Estructura, ModoAlmacenamiento } from "./tipos";


const LOCAL_STORAGE_STATE_NAME = 'hdr-state';
const LAST_AUTO_VALUE_PK_RAIZ = 'proximo_valor_pk_raiz';
const APP_CACHE_VERSION = 'app-cache-version';
const MODO_DM_LOCALSTORAGE_KEY = 'modo_dm';
export const GLOVAR_DATOSBYPASS = 'datosbypass';
export const GLOVAR_MODOBYPASS = 'modobypass';
export const GLOVAR_ESTRUCTURA = 'estructura';

// Configuración de almacenamiento local (localStorage/sessionStorage).
// Es la configuración recomendada por defecto para el renderer offline.
const localStorageConfig = {
    getCasoState() {
        return myOwn.getLocalVar(LOCAL_STORAGE_STATE_NAME);
    },

    setCasoState(state: any) {
        myOwn.setLocalVar(LOCAL_STORAGE_STATE_NAME, state);
    },

    getUltimoValorPkRaiz() {
        return myOwn.getLocalVar(LAST_AUTO_VALUE_PK_RAIZ);
    },

    setUltimoValorPkRaiz(value: string) {
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

    leerEstructura(): Promise<Estructura | null> {
        return Promise.resolve(myOwn.getLocalVar(GLOVAR_ESTRUCTURA));
    },
    
    persistirEstructura(estructura: Estructura): Promise<void> {
        myOwn.setLocalVar(GLOVAR_ESTRUCTURA, estructura);
        return Promise.resolve();
    },

    leerDatos(): Promise<DatosByPassPersistibles | null> {
        var modoAlmacenamiento = myOwn.getSessionVar(GLOVAR_MODOBYPASS) as ModoAlmacenamiento;
        
        if (modoAlmacenamiento == 'local') {
            return Promise.resolve(myOwn.getLocalVar(GLOVAR_DATOSBYPASS));
        } else {
            return Promise.resolve(myOwn.getSessionVar(GLOVAR_DATOSBYPASS));
        }
    },

    persistirDatos(datos: DatosByPassPersistibles): Promise<void> {
        var { modoAlmacenamiento } = datos;
        if (modoAlmacenamiento == 'local') {
            myOwn.setLocalVar(GLOVAR_DATOSBYPASS, datos);
        } else {
            myOwn.setSessionVar(GLOVAR_DATOSBYPASS, datos);
        }
        myOwn.setSessionVar(GLOVAR_MODOBYPASS, modoAlmacenamiento);
        return Promise.resolve();
    }
};

/**
 * Crea un FormRenderer con almacenamiento en localStorage/sessionStorage.
 * Es la configuración recomendada por defecto para el modo offline.
 * Se puede sobreescribir cualquier método mediante partialConfig.
 */
export function createLocalStorageFormRenderer(
    partialConfig: Parameters<typeof createFormRenderer>[0]
): FormRenderer {
    return createFormRenderer({ ...localStorageConfig, ...partialConfig });
}

/**
 * @deprecated Usar createLocalStorageFormRenderer en su lugar.
 * Se mantiene por compatibilidad mientras se migran los consumidores.
 */
export function initFormRenderer() {
    return createLocalStorageFormRenderer({});
}