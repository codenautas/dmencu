"use strict";

export * from 'procesamiento';
import * as BackendPlus from "backend-plus";

export type ProcedureDef = BackendPlus.ProcedureDef & {
    definedIn?:string
}

export type MenuInfoBase = BackendPlus.MenuInfoBase;

export interface Puedes{
    puede:{
        encuestas:{
            relevar:boolean
        },
        campo:{
            editar:boolean
            administrar:boolean
        }
    }
    superuser?:true
}

export interface Context extends BackendPlus.Context, Puedes{}


// export interface TableContext extends BackendPlus.TableContext, Puedes{}

namespace BackendPlus{
    interface TableContext2 extends Puedes{}
    interface TableContext{
        puede:{
            encuestas:{
                relevar:boolean
            },
            lab_resultado:{
                editar:boolean
                ver:boolean
            },
            campo:{
                administrar:boolean
            }
        }
        superuser?:true
    }
}