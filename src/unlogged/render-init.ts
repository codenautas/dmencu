import { setFormularioConfig } from "./render-config";
import { ModoDM } from "./tipos";


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
        // @ts-ignore
        ambienteDemo: myOwn.config.config.ambiente == 'test' || myOwn.config.config.ambiente == 'demo',
    });
}