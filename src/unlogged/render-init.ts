import { setFormularioConfig } from "./render-config";
import { DatosByPassPersistibles, ModoDM, Estructura, ModoAlmacenamiento } from "./tipos";


const LOCAL_STORAGE_STATE_NAME = 'hdr-state';
const LAST_AUTO_VALUE_PK_RAIZ = 'proximo_valor_pk_raiz';
const APP_CACHE_VERSION = 'app-cache-version';
const MODO_DM_LOCALSTORAGE_KEY = 'modo_dm';
export const GLOVAR_DATOSBYPASS = 'datosbypass';
export const GLOVAR_MODOBYPASS = 'modobypass';
export const GLOVAR_ESTRUCTURA = 'estructura';

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

        leerEstructura(): Promise<Estructura | null> {
            return myOwn.getLocalVar(GLOVAR_ESTRUCTURA);
        },
        
        persistirEstructura(estructura: Estructura): Promise<void> {
            myOwn.setLocalVar(GLOVAR_ESTRUCTURA, estructura);
            return Promise.resolve();
        },

        leerDatos(): Promise<DatosByPassPersistibles | null> {
            var modoAlmacenamiento = myOwn.getSessionVar(GLOVAR_MODOBYPASS) as ModoAlmacenamiento;
            
            if (modoAlmacenamiento == 'local') {
                return myOwn.getLocalVar(GLOVAR_DATOSBYPASS);
            } else {
                return myOwn.getSessionVar(GLOVAR_DATOSBYPASS);
            }
        },

        persistirDatos(datos: DatosByPassPersistibles): Promise<void> {
            //throw new Error('Persistir no implementado en este modo');
            var { modoAlmacenamiento } = datos;
            if (modoAlmacenamiento == 'local') {
                myOwn.setLocalVar(GLOVAR_DATOSBYPASS, datos);
            } else {
                myOwn.setSessionVar(GLOVAR_DATOSBYPASS, datos);
            }
            myOwn.setSessionVar(GLOVAR_MODOBYPASS, modoAlmacenamiento);
            return Promise.resolve();
        },

        async sincronizar(_persistentes: DatosByPassPersistibles | null, _cambiaModoDM: boolean): Promise<DatosByPassPersistibles> {
            throw new Error('Sincronizar no implementado en este modo');
        },
    });
}