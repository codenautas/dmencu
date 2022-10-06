import {DatosByPassPersistibles, Estructura, ForPkRaiz,
    Respuestas,
    ModoAlmacenamiento,
    PlainForPk,
    toPlainForPk,
} from "./tipos";

import * as likeAr from "like-ar";

import { 
    setDatosByPass, setEncolarBackup, setEstructura, setPersistirDatosByPass 
} from "./bypass-formulario"

export const GLOVAR_DATOSBYPASS='datosbypass';
export const GLOVAR_MODOBYPASS='modobypass';
export const GLOVAR_ESTRUCTURA='estructura';
export const BACKUPS = 'backups';

setPersistirDatosByPass(
    async function persistirEnMemoria(persistentes:DatosByPassPersistibles){
        var {modoAlmacenamiento} = persistentes
        if(modoAlmacenamiento=='local'){
            my.setLocalVar(GLOVAR_DATOSBYPASS, persistentes)
        }else{
            my.setSessionVar(GLOVAR_DATOSBYPASS, persistentes)
        }
        my.setSessionVar(GLOVAR_MODOBYPASS, modoAlmacenamiento)
    }
)

export function recuperarDatosByPass(){
    var recuperado:DatosByPassPersistibles;
    var modoAlmacenamiento = my.getSessionVar(GLOVAR_MODOBYPASS) as ModoAlmacenamiento;
    if(modoAlmacenamiento=='local'){
        recuperado = my.getLocalVar(GLOVAR_DATOSBYPASS)
    }else{
        recuperado = my.getSessionVar(GLOVAR_DATOSBYPASS)
    }
    if(recuperado){
        setDatosByPass({...recuperado, modoAlmacenamiento})
    }
    return
}

export function cargarHojaDeRuta(nuevoPaquete:{respuestas:Respuestas, modoAlmacenamiento:ModoAlmacenamiento, dirty?:boolean}){
    var modoActual = my.getSessionVar(GLOVAR_MODOBYPASS);
    if(modoActual && nuevoPaquete.modoAlmacenamiento!=modoActual){
        throw new Error('No se pueden mezclar modos de apertura de encuestas, directo y por hoja de ruta para MD ('+modoActual+', '+nuevoPaquete.modoAlmacenamiento+')');
    }
    var datosByPass = {
        ...nuevoPaquete, 
        dirty: nuevoPaquete.dirty??false
    }
    setDatosByPass(datosByPass);
}

export function cargarEstructura(estructuraACargar:Estructura){
    var estructura = setEstructura(estructuraACargar);
    my.setLocalVar(GLOVAR_ESTRUCTURA, estructura);
}

//////////////////////////////////////////////////////////////////////////


type Backups={
    idActual:number,
    token:string|undefined,
    tem:{[key in PlainForPk]:{idBackup:number, forPkRaiz:ForPkRaiz, respuestasRaiz:Respuestas}}
}

var backupPendiente = Promise.resolve();

async function enviarBackup(){
    var backups:Backups = my.getLocalVar(BACKUPS);
    var {token, tem} = backups;
    if(likeAr(tem).array().length){
        try{
            await my.ajax.dm_backup({token, tem})
            // tengo que levantarlo de nuevo porque acá hay una interrupción del flujo
            var backupsALimpiar:Backups = my.getLocalVar(BACKUPS);
            backupsALimpiar.tem=likeAr(backupsALimpiar.tem).filter(caso=>caso.idBackup>backups.idActual).plain();
            my.setLocalVar(BACKUPS, backupsALimpiar);
        }catch(err){
            console.log('no se pudo hacer backup', err);
        }
    }
}

setEncolarBackup(
    function encolarBackup(token:string|undefined, forPkRaiz:ForPkRaiz, respuestasRaiz:Respuestas){
        var backups:Backups = my.existsLocalVar(BACKUPS)?my.getLocalVar(BACKUPS):{
            idActual:0,
            tem:{}
        };
        backups.idActual+=1;
        backups.token=token;
        let plainForPk = toPlainForPk(forPkRaiz);
        backups.tem[plainForPk]={idBackup:backups.idActual, forPkRaiz, respuestasRaiz};
        my.setLocalVar(BACKUPS,backups);
        backupPendiente = backupPendiente.then(enviarBackup)
    }
)
