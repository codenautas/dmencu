import {
    DatosByPassPersistibles, Estructura, ForPkRaiz,
    Respuestas,
    ModoAlmacenamiento,
    PlainForPk,
    toPlainForPk,
    Carga,
    IdEnc,
    IdCarga,
    CampoPk,
    CampoPkRaiz,
    ModoDM
} from "./tipos";

import * as likeAr from "like-ar";
import { expected } from "cast-error";

import {
    getDatosByPass,
    getEstructura,
    setEncolarBackup, setEstructura,
} from "./bypass-formulario"
import { getFormRenderer } from "../unlogged/render-config";

export const BACKUPS = 'backups';

export function cargarEstructura(estructuraACargar: Estructura) {
    setEstructura(estructuraACargar);
}

//////////////////////////////////////////////////////////////////////////


type Backups = {
    idActual: number,
    token: string | undefined,
    tem: { [key in PlainForPk]: { idBackup: number, forPkRaiz: ForPkRaiz, respuestasRaiz: Respuestas, carga: Carga, idper: string } },
}

var backupPendiente = Promise.resolve();

async function enviarBackup() {
    var backups: Backups = my.getLocalVar(BACKUPS);
    var { token, tem } = backups;
    if (likeAr(tem).array().length) {
        try {
            let modoDM: ModoDM = getFormRenderer().getModoDM() || await my.ajax.modo_dm_defecto_obtener({});
            getFormRenderer().setModoDM(modoDM);
            await my.ajax.dm_backup({ token, tem, modo_dm: modoDM });
            // tengo que levantarlo de nuevo porque acá hay una interrupción del flujo
            var backupsALimpiar: Backups = my.getLocalVar(BACKUPS);
            backupsALimpiar.tem = likeAr(backupsALimpiar.tem).filter(caso => caso.idBackup > backups.idActual).plain();
            my.setLocalVar(BACKUPS, backupsALimpiar);
        } catch (err) {
            console.error('no se pudo hacer backup', expected(err));
        }
    }
}

setEncolarBackup(
    function encolarBackup(token: string | undefined, forPkRaiz: ForPkRaiz, respuestasRaiz: Respuestas) {
        var backups: Backups = my.existsLocalVar(BACKUPS) ? my.getLocalVar(BACKUPS) : {
            idActual: 0,
            tem: {},
        };
        backups.idActual += 1;
        backups.token = token;
        let plainForPk = toPlainForPk(forPkRaiz);
        const datosByPass = getDatosByPass();
        let estructura = getEstructura();
        let carga = datosByPass.cargas[datosByPass.informacionHdr[forPkRaiz[estructura.pkAgregadaUaPpal] as IdEnc].tem.carga as IdCarga];
        backups.tem[plainForPk] = { idBackup: backups.idActual, forPkRaiz, respuestasRaiz, carga, idper: datosByPass.idper };
        my.setLocalVar(BACKUPS, backups);
        backupPendiente = backupPendiente.then(enviarBackup)
    }
)
