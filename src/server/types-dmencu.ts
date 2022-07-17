"use strict";

import * as bePlus from "backend-plus";

export * from 'procesamiento'; //expose Procesamiento types

export type ProcedureDef = bePlus.ProcedureDef & {
    definedIn?:string
}

export type MenuInfoBase = bePlus.MenuInfoBase;

export interface Puedes{
    puede?:{
        encuestas:{
            relevar:boolean,
            justificar: boolean,
            procesar: boolean
        },
        campo:{
            editar:boolean
            administrar:boolean
        }
    }
    superuser?:true
}

export interface Context extends bePlus.ContextForDump, Puedes{}