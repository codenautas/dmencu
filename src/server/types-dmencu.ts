"use strict";

import * as bePlus from "backend-plus";

export * from 'procesamiento'; //expose Procesamiento types
export {emergeAppMetaEnc, emergeAppRelEnc} from 'meta-enc'; //expose types only in meta-enc stack
export * from './table-tem';

export type Puede = {
    encuestas:{
        relevar:boolean,
        justificar: boolean,
        procesar: boolean
    },
    casilleros_texto:{
        editar:boolean
    }
    campo:{
        editar:boolean
        administrar:boolean
    }
}

export type Permisos = {
    puede?: Puede
    superuser?: boolean
}

declare module "backend-plus"{
    export interface ProcedureDef{
        definedIn?:string
    }

    export interface Caches{
        tableContent: Record<string, any>
        metaEncIncluirCasillerosSaltoREL: boolean
        timestampEstructura: number
        permisosRol: Permisos
        permisosRolSoloTrue: Permisos
        permisosSuperuser: Puede
        permisosParaNadie: Puede

    }

    export interface Context{
        puede?: Puede
        superuser?: true
    }

    export interface OptsClientPage {
        offlineFile: boolean 
    }

    export interface ClientSetup {
        idper: string|undefined
    }
}

export type MenuInfoBase = bePlus.MenuInfoBase;

export type SufijosAmbiente = '_test'|'_capa'|''