import { createFormRenderer, FormRenderer } from "./render-config";
import { DatosByPassPersistibles, ModoDM, Estructura, ModoAlmacenamiento } from "./tipos";


const LOCAL_STORAGE_STATE_NAME = 'hdr-state';
const LAST_AUTO_VALUE_PK_RAIZ = 'proximo_valor_pk_raiz';
const APP_CACHE_VERSION = 'app-cache-version';
const MODO_DM_LOCALSTORAGE_KEY = 'modo_dm';
export const GLOVAR_DATOSBYPASS = 'datosbypass';
export const GLOVAR_MODOBYPASS = 'modobypass';
export const GLOVAR_ESTRUCTURA = 'estructura';
export const SETUP = 'setup';
export const LAST_LOGGED_SETUP = 'last_logged_setup';

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
        const setup = myOwn.getLocalVar(SETUP) || {};
        const backup = myOwn.getLocalVar(LAST_LOGGED_SETUP) || {};

        if (setup.idper) {
            // Si el setup está sano, nos aseguramos de que el backup esté actualizado
            if (backup.idper !== setup.idper) {
                myOwn.setLocalVar(LAST_LOGGED_SETUP, { ...backup, idper: setup.idper });
            }
            return setup.idper;
        }

        // Si perdimos la cookie y el setup vino vacío, usamos el backup
        return backup.idper || null;
    },

    getUsernameLogueado() {
        const setup = myOwn.getLocalVar(SETUP) || {};
        const backup = myOwn.getLocalVar(LAST_LOGGED_SETUP) || {};

        if (setup.username) {
            if (backup.username !== setup.username) {
                myOwn.setLocalVar(LAST_LOGGED_SETUP, { ...backup, username: setup.username });
            }
            return setup.username;
        }

        return backup.username || null;
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